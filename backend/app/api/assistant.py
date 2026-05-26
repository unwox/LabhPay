"""
Stage 8 — LabhPay Assistant chat endpoint.

POST /assistant/chat
Body:
  {
    "question": str,
    "regenerate": bool = false,        # forces a different provider tier
    "ids": str | None                  # optional comma-separated job_ids
  }

Behaviour:
  - Loads the user's statements from Redis (same scan pattern as /dashboard).
  - Builds a retrieval Context (top ~30 txns + aggregates + intent).
  - Calls the AI gateway with the `assistant_chat` prompt.
  - Default tier is "deep"; regenerate=true flips to "fast" so the user can
    swap voices/cost without re-typing the question.
  - Enforces RATE_LIMIT_ASSISTANT_TURNS_PER_DAY per user (Redis counter).
  - Parses cited [txn_id] markers out of the reply so the frontend can
    highlight rows.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.dependencies import current_user
from app.core.redis_client import get_redis
from app.core.security import AccessClaims
from app.services.retrieval import MAX_CONTEXT_TXNS, build_context
from app.services.storage import _str_client, get_result
from utils.audit import emit as audit_emit, hash_user_id

router = APIRouter(prefix="/assistant", tags=["assistant"])

_CITATION_RE = re.compile(r"\[([a-f0-9]{6,32})\]")


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    regenerate: bool = False
    ids: str | None = None


class ChatResponse(BaseModel):
    answer: str
    txn_ids_cited: list[str]
    retrieval_count: int
    fallback_used: bool
    tier_used: str
    prompt_version: str
    generated_at: str


def _list_job_ids(user_id: str) -> list[str]:
    out: list[str] = []
    prefix = f"sess:{user_id}:result:"
    for k in _str_client().scan_iter(match=f"{prefix}*", count=200):
        out.append(k[len(prefix):])
    return out


def _check_turn_rate(user_id: str) -> None:
    s = get_settings()
    limit = s.RATE_LIMIT_ASSISTANT_TURNS_PER_DAY
    r = get_redis()
    key = f"rl:assistant:{user_id}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, 24 * 3600)
    count, _ = pipe.execute()
    if int(count) > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"You've hit today's limit of {limit} Assistant turns. "
                "It resets in 24 hours."
            ),
        )


def _extract_citations(text: str, valid_ids: set[str]) -> list[str]:
    seen: list[str] = []
    for m in _CITATION_RE.finditer(text or ""):
        cid = m.group(1)
        if cid in valid_ids and cid not in seen:
            seen.append(cid)
    return seen[:5]


@router.post("/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> ChatResponse:
    _check_turn_rate(claims.sub)

    job_ids = (
        [i.strip() for i in req.ids.split(",") if i.strip()]
        if req.ids
        else _list_job_ids(claims.sub)
    )
    statements = []
    for jid in job_ids:
        r = get_result(user_id=claims.sub, job_id=jid)
        if r:
            statements.append(r.statement)

    if not statements:
        # No data — answer deterministically so we don't bill the user for
        # a guaranteed "I can't see anything" call.
        return ChatResponse(
            answer=(
                "I can't see any statements in this session yet. Upload one "
                "from the dashboard and ask me again — I'll be able to "
                "answer about merchants, charges, subscriptions and more."
            ),
            txn_ids_cited=[],
            retrieval_count=0,
            fallback_used=False,
            tier_used="none",
            prompt_version="assistant_chat@v0.2",
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    ctx = build_context(req.question, statements, max_txns=MAX_CONTEXT_TXNS)
    valid_ids = {t["id"] for t in ctx.transactions}

    # Lazy gateway import so unit tests can stub the module.
    from ai_gateway import get_gateway
    from ai_gateway.prompts import get_prompt

    prompt = get_prompt("assistant_chat")
    tier = "fast" if req.regenerate else prompt.tier
    try:
        messages = prompt.render(
            context_json=json.dumps(ctx.to_prompt_payload(), ensure_ascii=False),
            question=req.question,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not render prompt: {e}",
        )

    try:
        gateway = get_gateway()
        result = gateway.chat(messages, tier=tier, user_id=claims.sub)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Assistant is temporarily unavailable: {e}",
        )

    answer = (result.text or "").strip()
    cited = _extract_citations(answer, valid_ids)

    audit_emit(
        "assistant.turn",
        user=hash_user_id(claims.sub),
        tier=tier,
        retrieval=ctx.retrieval_count,
        fallback=ctx.fallback_used,
        citations=len(cited),
        regenerate=req.regenerate,
    )

    return ChatResponse(
        answer=answer,
        txn_ids_cited=cited,
        retrieval_count=ctx.retrieval_count,
        fallback_used=ctx.fallback_used,
        tier_used=tier,
        prompt_version=f"{prompt.name}@{prompt.version}",
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/suggestions")
def suggestions(
    claims: Annotated[AccessClaims, Depends(current_user)],
    ids: str | None = Query(None),
) -> dict:
    """Cheap deterministic prompt suggestions tailored to the user's data."""
    job_ids = (
        [i.strip() for i in ids.split(",") if i.strip()]
        if ids
        else _list_job_ids(claims.sub)
    )
    statements = []
    for jid in job_ids:
        r = get_result(user_id=claims.sub, job_id=jid)
        if r:
            statements.append(r.statement)

    base = [
        "Which subscriptions are recurring?",
        "Why is my bill high?",
        "Show my top 5 merchants this cycle.",
    ]

    if not statements:
        return {"suggestions": base}

    # Bias suggestions to merchants the user actually has.
    from collections import Counter
    debits = [t for s in statements for t in s.transactions if t.is_debit]
    cnt: Counter[str] = Counter()
    for t in debits:
        m = (t.merchant_norm or t.merchant_raw or "").strip()
        if m:
            cnt[m] += 1
    extra: list[str] = []
    for m, _ in cnt.most_common(2):
        first = m.split()[0].title()
        extra.append(f"How much did I spend on {first}?")
    return {"suggestions": (extra + base)[:5]}
