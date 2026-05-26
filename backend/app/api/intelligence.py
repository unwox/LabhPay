"""
Stage 7 — /intelligence/summary

Aggregates Spending Intelligence cards, Suspicious Activity items, and the
Spending Profile tags across every Statement in the user's session.

Mirrors the dashboard API's session-scoped scan pattern: it picks up every
result key under sess:{uid}:result:* unless `ids` is provided.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import current_user
from app.core.security import AccessClaims
from app.services.intelligence import analyze
from app.services.storage import _str_client, get_result

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


def _list_job_ids(user_id: str) -> list[str]:
    out: list[str] = []
    prefix = f"sess:{user_id}:result:"
    for k in _str_client().scan_iter(match=f"{prefix}*", count=200):
        out.append(k[len(prefix):])
    return out


@router.get("/summary")
def summary(
    claims: Annotated[AccessClaims, Depends(current_user)],
    ids: str | None = Query(None, description="Comma-separated job ids; omit for all"),
    phrase: bool = Query(True, description="Use LLM to phrase insight cards"),
) -> dict:
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
    return analyze(statements, user_id=claims.sub, use_llm=phrase)
