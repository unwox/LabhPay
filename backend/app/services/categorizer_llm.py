"""
Stage 7 — LLM fallback for transactions the rule engine couldn't classify.

Pipeline:
  - deterministic categorize() already ran (rules + merchant map + regex)
  - this function picks transactions with category=OTHER and confidence<0.5,
    deduplicates by merchant_norm, asks the LLM once for a verdict per
    unique merchant, then patches the transactions in-place.

We never send the LLM card numbers, amounts, or dates — just merchant strings.
"""

from __future__ import annotations

import json
import logging
from typing import Iterable

from shared.categories import Category
from shared.schemas import Transaction

log = logging.getLogger("labhpay.categorizer_llm")

PROMPT_NAME = "categorize_merchants"
MAX_MERCHANTS_PER_CALL = 60
LOW_CONF = 0.5


def _candidates(txns: Iterable[Transaction]) -> list[Transaction]:
    out: list[Transaction] = []
    for t in txns:
        if t.category == Category.OTHER and t.category_confidence < LOW_CONF:
            out.append(t)
    return out


def _unique_merchants(cands: list[Transaction]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for t in cands:
        m = (t.merchant_norm or t.merchant_raw or "").strip()
        if not m or m.lower() in seen:
            continue
        seen.add(m.lower())
        out.append(m)
    return out[:MAX_MERCHANTS_PER_CALL]


def _coerce_category(value: str) -> Category:
    if not value:
        return Category.OTHER
    try:
        return Category(value.strip().lower())
    except ValueError:
        return Category.OTHER


def _parse_response(text: str) -> dict[str, tuple[Category, float]]:
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if "\n" in text:
            text = text.split("\n", 1)[1]
    try:
        parsed = json.loads(text)
    except Exception:
        log.info("categorize_merchants returned non-JSON; falling back.")
        return {}
    if not isinstance(parsed, list):
        return {}
    out: dict[str, tuple[Category, float]] = {}
    for item in parsed:
        if not isinstance(item, dict):
            continue
        merchant = str(item.get("merchant", "")).strip()
        if not merchant:
            continue
        cat = _coerce_category(str(item.get("category", "")))
        try:
            conf = float(item.get("confidence", 0.0))
        except (TypeError, ValueError):
            conf = 0.0
        conf = max(0.0, min(1.0, conf))
        out[merchant.lower()] = (cat, conf)
    return out


def llm_fallback_categorize(
    txns: list[Transaction],
    *,
    user_id: str | None = None,
) -> list[Transaction]:
    """Return a new list with low-confidence transactions re-categorized via
    the AI gateway. Original list is not mutated. Falls through (returns the
    input unchanged) on any error so the pipeline never breaks."""
    try:
        from app.core.config import get_settings
        if not get_settings().AI_CATEGORIZATION_FALLBACK:
            return txns
    except Exception:
        return txns

    candidates = _candidates(txns)
    merchants = _unique_merchants(candidates)
    if not merchants:
        return txns

    try:
        from ai_gateway import get_gateway
        from ai_gateway.prompts import get_prompt
    except Exception as e:  # pragma: no cover
        log.warning("ai_gateway import failed in categorizer fallback: %s", e)
        return txns

    try:
        prompt = get_prompt(PROMPT_NAME)
    except KeyError:
        log.warning("Prompt %s not registered; skipping LLM fallback.", PROMPT_NAME)
        return txns

    try:
        messages = prompt.render(merchants_json=json.dumps(merchants, ensure_ascii=False))
    except Exception as e:
        log.warning("categorize_merchants render failed: %s", e)
        return txns

    try:
        gateway = get_gateway()
        result = gateway.chat(messages, tier=prompt.tier, user_id=user_id)
    except Exception as e:
        log.info("LLM categorization unavailable; keeping rule output. cause=%s", e)
        return txns

    verdicts = _parse_response(result.text or "")
    if not verdicts:
        return txns

    out: list[Transaction] = []
    for t in txns:
        if t.category == Category.OTHER and t.category_confidence < LOW_CONF:
            m = (t.merchant_norm or t.merchant_raw or "").strip().lower()
            v = verdicts.get(m)
            if v is not None:
                cat, conf = v
                # Cap LLM confidence so it stays below a rule-engine exact hit.
                conf = min(conf, 0.75)
                out.append(t.model_copy(update={"category": cat, "category_confidence": conf}))
                continue
        out.append(t)
    return out
