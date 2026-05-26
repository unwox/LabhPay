"""
Stage 7 — Intelligence orchestrator.

Glues together:
  - signals.generate_signals()  : deterministic Signal[] from Statements
  - profile.profile_tags()      : Spending Profile tags
  - ai_gateway phrase_insights  : optional LLM phrasing pass (one batched call,
                                  capped at ~800 output tokens)

The LLM is used only to *rephrase* pre-computed signals. It never sees:
  - card numbers (we send only the last4 fragment from signal.refs)
  - full transaction rows (we send only the signal id + numeric refs)

Behaviour is deterministic when the LLM is unavailable: we fall back to the
generator's raw_title / raw_body / next_step_hint.

Output shape (matches the API response):
{
  insights: [
    {id, title, body, next_step, severity, confidence, category,
     impact_inr, beginner_body, refs}
  ],            # max 6, ranked
  suspicious: [ ...same shape, signals with is_suspicious=True ],
  profile_tags: [ {id, title, body, score, icon} ],
  generated_at: iso8601,
  llm_used: bool,
}
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any

from app.services.profile import ProfileTag, profile_tags
from app.services.signals import Signal, generate_signals
from shared.schemas import Statement

log = logging.getLogger("labhpay.intelligence")

MAX_INSIGHTS = 6
MAX_SUSPICIOUS = 6
PHRASE_PROMPT = "phrase_insights"


# ---------- result types ----------

@dataclass
class InsightCard:
    id: str
    title: str
    body: str
    next_step: str
    severity: int
    confidence: float
    category: str
    impact_inr: float
    beginner_body: str
    refs: dict
    is_suspicious: bool
    txn_ids: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


# ---------- LLM phrasing ----------

def _beginner_body(sig: Signal) -> str:
    """A short, plain-English version of the body used when beginner-mode is on."""
    body_map = {
        "hidden_charges":
            "When you don't pay the full bill, the bank charges you interest "
            "on the unpaid part. That's what this fee is.",
        "high_utilization":
            "Using a big chunk of your credit limit can lower your credit "
            "score, even if you always pay on time.",
        "duplicate_charge":
            "The same shop charged you twice on the same day. Often a glitch — "
            "worth checking before you let it slide.",
        "large_outlier":
            "This charge is much bigger than what you usually spend. Just a "
            "quick sanity check before it leaves your account.",
        "forex_markup":
            "Buying in dollars or euros costs you 2-3% extra on most Indian "
            "cards. If you do this often, a travel card is cheaper.",
        "subscriptions_active":
            "These are auto-renewing monthly charges. Cancelling the ones you "
            "don't use frees up money every month.",
        "category_dominance":
            "Most of your spending went to one category. A card that gives "
            "extra rewards there could earn you more cashback or points.",
        "weekend_spender":
            "Weekend spending is hard to track because it feels different "
            "from weekday spending. Knowing the split helps you plan.",
        "emi_burden":
            "EMIs are easy money loans on your card. They feel small per "
            "month but add up — and usually come with a processing fee.",
        "late_fee":
            "A late fee triggers if even ₹1 of the minimum due is unpaid by "
            "the due date. Autopay on the minimum prevents it entirely.",
    }
    return body_map.get(sig.id, sig.raw_body)


def _llm_payload(signals: list[Signal]) -> str:
    """JSON-encode signals for the phrase_insights prompt, redacting nothing
    sensitive (refs never carry raw card numbers — only last4)."""
    items = []
    for s in signals:
        items.append({
            "id": s.id,
            "category": s.category,
            "severity": s.severity,
            "confidence": round(s.confidence, 2),
            "raw_title": s.raw_title,
            "raw_body": s.raw_body,
            "next_step_hint": s.next_step_hint,
            "refs": s.refs,
        })
    return json.dumps(items, ensure_ascii=False)


def _phrase_with_llm(signals: list[Signal], *, user_id: str | None) -> list[dict] | None:
    """Returns parsed [{title, body, next_step}, ...] aligned to `signals`,
    or None if the LLM call failed / produced unusable output."""
    if not signals:
        return []
    try:
        from ai_gateway import get_gateway
        from ai_gateway.prompts import get_prompt
    except Exception as e:  # pragma: no cover
        log.warning("ai_gateway import failed: %s", e)
        return None

    try:
        prompt = get_prompt(PHRASE_PROMPT)
    except KeyError:
        log.warning("Prompt %s not registered; skipping LLM phrasing.", PHRASE_PROMPT)
        return None

    payload = _llm_payload(signals)
    try:
        messages = prompt.render(signals_json=payload)
    except Exception as e:
        log.warning("phrase_insights render failed: %s", e)
        return None

    try:
        gateway = get_gateway()
    except Exception as e:
        log.warning("get_gateway failed: %s", e)
        return None

    try:
        result = gateway.chat(messages, tier=prompt.tier, user_id=user_id)
    except Exception as e:
        # Budget exceeded, all providers down, etc. — fall back to raw.
        log.info("LLM phrasing unavailable, using rule-engine text. cause=%s", e)
        return None

    text = (result.text or "").strip()
    # The prompt asks for strict JSON. Be tolerant of code fences.
    if text.startswith("```"):
        text = text.strip("`")
        # Drop a leading language tag like "json\n"
        if "\n" in text:
            text = text.split("\n", 1)[1]
    try:
        parsed = json.loads(text)
    except Exception:
        log.info("phrase_insights returned non-JSON; falling back to raw text.")
        return None

    if not isinstance(parsed, list):
        return None
    out: list[dict] = []
    for item in parsed:
        if not isinstance(item, dict):
            out.append({})
            continue
        out.append({
            "title": str(item.get("title", "")).strip(),
            "body": str(item.get("body", "")).strip(),
            "next_step": str(item.get("next_step", "")).strip(),
        })
    # Pad/truncate so the result aligns 1:1 with input signals.
    if len(out) < len(signals):
        out += [{}] * (len(signals) - len(out))
    return out[: len(signals)]


# ---------- ranking + assembly ----------

def _to_card(sig: Signal, phrased: dict | None) -> InsightCard:
    p = phrased or {}
    title = p.get("title") or sig.raw_title
    body = p.get("body") or sig.raw_body
    next_step = p.get("next_step") or sig.next_step_hint
    return InsightCard(
        id=sig.id,
        title=title,
        body=body,
        next_step=next_step,
        severity=sig.severity,
        confidence=round(sig.confidence, 3),
        category=sig.category,
        impact_inr=round(sig.impact_inr, 2),
        beginner_body=_beginner_body(sig),
        refs=sig.refs,
        is_suspicious=sig.is_suspicious,
        txn_ids=sig.txn_ids,
    )


def _ranked(signals: list[Signal]) -> list[Signal]:
    return sorted(signals, key=lambda s: s.rank_score, reverse=True)


def _profile_to_dict(t: ProfileTag) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "body": t.body,
        "score": t.score,
        "icon": t.icon,
    }


# ---------- public entry point ----------

def analyze(
    statements: list[Statement],
    *,
    user_id: str | None = None,
    use_llm: bool = True,
) -> dict[str, Any]:
    """Produce the Stage 7 intelligence payload for a set of statements."""
    if not statements:
        return {
            "insights": [],
            "suspicious": [],
            "profile_tags": [],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "llm_used": False,
        }

    all_signals = generate_signals(statements)
    ranked = _ranked(all_signals)

    insight_signals = ranked[:MAX_INSIGHTS]
    suspicious_signals = [s for s in ranked if s.is_suspicious][:MAX_SUSPICIOUS]

    # One batched LLM call covering the union of cards we plan to render
    # (so we don't pay tokens twice for a signal that appears in both lists).
    union: list[Signal] = []
    seen: set[int] = set()
    for s in insight_signals + suspicious_signals:
        if id(s) in seen:
            continue
        seen.add(id(s))
        union.append(s)

    phrased_by_idx: dict[int, dict] = {}
    llm_used = False
    if use_llm and union:
        phrased = _phrase_with_llm(union, user_id=user_id)
        if phrased is not None:
            llm_used = True
            for sig, p in zip(union, phrased):
                phrased_by_idx[id(sig)] = p

    insights = [_to_card(s, phrased_by_idx.get(id(s))).to_dict() for s in insight_signals]
    suspicious = [_to_card(s, phrased_by_idx.get(id(s))).to_dict() for s in suspicious_signals]
    tags = [_profile_to_dict(t) for t in profile_tags(statements)]

    return {
        "insights": insights,
        "suspicious": suspicious,
        "profile_tags": tags,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "llm_used": llm_used,
    }
