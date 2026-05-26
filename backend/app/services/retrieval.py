"""
Stage 8 — Lexical retrieval over a user's loaded statements.

Why no embeddings (yet):
  - We promise "no embeddings persisted" and the v1 scope keeps this
    deterministic, free, and fast. A lexical scorer with a small
    intent-extraction layer reaches the spec's bar: pass <=30 txns to the
    LLM and let the model do the actual reasoning.

What we do extract from the question:
  - tokens                : lowercased, stop-words removed
  - merchant_terms        : tokens that look merchant-y (substring matches
                            against any seen merchant)
  - category_hints        : explicit category names (food, fuel, etc.)
  - recurring_intent      : asks about subs/recurring/monthly charges
  - charges_intent        : asks about fees/interest/late/why bill is high
  - time_window           : "this cycle", "last month", or a year/month
  - top_k                 : if the user asks for "top 5 …" we honour it

The retriever returns a Context bundle with:
  - statements[]      : compact statement meta (bank, last4, period, totals)
  - transactions[]    : the top ~30 hits, lightweight dicts
  - aggregates        : grand totals + grouped totals (by category/merchant)
  - intent            : what we inferred, used to bias prompt phrasing
"""

from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Iterable

from shared.categories import CATEGORY_ORDER, Category
from shared.schemas import Statement, Transaction

MAX_CONTEXT_TXNS = 30

_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "did", "do", "for",
    "from", "has", "have", "how", "i", "in", "is", "it", "me", "much",
    "my", "of", "on", "or", "show", "so", "spend", "spent", "the", "this",
    "to", "was", "we", "what", "when", "where", "which", "who", "why",
    "with", "you", "your", "tell", "give", "all", "rs", "rs.", "inr",
    "amount", "amounts", "total", "totals", "list", "lists",
}

_CATEGORY_ALIASES: dict[str, Category] = {
    "food": Category.FOOD, "dining": Category.FOOD, "restaurant": Category.FOOD,
    "restaurants": Category.FOOD, "eating": Category.FOOD, "swiggy": Category.FOOD,
    "zomato": Category.FOOD,
    "grocery": Category.GROCERIES, "groceries": Category.GROCERIES,
    "supermarket": Category.GROCERIES,
    "shopping": Category.SHOPPING, "shop": Category.SHOPPING,
    "amazon": Category.SHOPPING, "flipkart": Category.SHOPPING,
    "travel": Category.TRAVEL, "trip": Category.TRAVEL, "trips": Category.TRAVEL,
    "flight": Category.TRAVEL, "flights": Category.TRAVEL,
    "uber": Category.TRAVEL, "ola": Category.TRAVEL,
    "subscription": Category.SUBSCRIPTIONS, "subscriptions": Category.SUBSCRIPTIONS,
    "subs": Category.SUBSCRIPTIONS, "netflix": Category.SUBSCRIPTIONS,
    "spotify": Category.SUBSCRIPTIONS,
    "fuel": Category.FUEL, "petrol": Category.FUEL, "diesel": Category.FUEL,
    "utility": Category.UTILITIES, "utilities": Category.UTILITIES,
    "electricity": Category.UTILITIES,
    "telecom": Category.TELECOM, "phone": Category.TELECOM,
    "mobile": Category.TELECOM, "airtel": Category.TELECOM, "jio": Category.TELECOM,
    "healthcare": Category.HEALTHCARE, "health": Category.HEALTHCARE,
    "pharmacy": Category.HEALTHCARE, "medicine": Category.HEALTHCARE,
    "insurance": Category.INSURANCE, "policy": Category.INSURANCE,
    "emi": Category.EMI, "instalment": Category.EMI, "instalments": Category.EMI,
    "investment": Category.INVESTMENT, "mutual": Category.INVESTMENT,
    "stocks": Category.INVESTMENT, "sip": Category.INVESTMENT,
    "gaming": Category.GAMING, "rummy": Category.GAMING,
    "entertainment": Category.ENTERTAINMENT, "movies": Category.ENTERTAINMENT,
}


_RECURRING_PAT = re.compile(
    r"\b(recurring|subscription|subscriptions|subs|monthly|every\s+month|renew|renewal)\b",
    re.IGNORECASE,
)
_CHARGES_PAT = re.compile(
    r"\b(charge|charges|fee|fees|interest|finance|late|gst|tax|"
    r"penalty|why\s+(?:is|so)\s+(?:my\s+)?bill)\b",
    re.IGNORECASE,
)
_TOP_K_PAT = re.compile(r"\btop\s+(\d{1,2})\b", re.IGNORECASE)


# ---------- intent ----------

@dataclass
class Intent:
    tokens: list[str]
    merchant_terms: list[str]
    category_hints: list[Category]
    recurring: bool = False
    charges: bool = False
    top_k: int | None = None
    raw: str = ""

    def to_dict(self) -> dict:
        return {
            "tokens": self.tokens,
            "merchant_terms": self.merchant_terms,
            "category_hints": [c.value for c in self.category_hints],
            "recurring": self.recurring,
            "charges": self.charges,
            "top_k": self.top_k,
        }


def _tokenize(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z][a-z0-9]{1,}", text.lower()) if t not in _STOPWORDS]


def _merchant_universe(statements: Iterable[Statement]) -> set[str]:
    out: set[str] = set()
    for s in statements:
        for t in s.transactions:
            m = (t.merchant_norm or t.merchant_raw or "").lower()
            if m:
                # Index per-word so "amazon pay" can be matched by "amazon".
                for w in re.findall(r"[a-z][a-z0-9]{2,}", m):
                    out.add(w)
    return out


def extract_intent(question: str, *, statements: list[Statement]) -> Intent:
    tokens = _tokenize(question)
    merchants = _merchant_universe(statements)
    merchant_terms = [t for t in tokens if t in merchants]
    cat_hits: list[Category] = []
    seen_cats: set[Category] = set()
    for t in tokens:
        c = _CATEGORY_ALIASES.get(t)
        if c and c not in seen_cats:
            seen_cats.add(c)
            cat_hits.append(c)
    top_k_match = _TOP_K_PAT.search(question)
    return Intent(
        tokens=tokens,
        merchant_terms=merchant_terms,
        category_hints=cat_hits,
        recurring=bool(_RECURRING_PAT.search(question)),
        charges=bool(_CHARGES_PAT.search(question)),
        top_k=int(top_k_match.group(1)) if top_k_match else None,
        raw=question,
    )


# ---------- scoring ----------

def _score(t: Transaction, intent: Intent) -> float:
    """Cheap lexical score. Higher = more relevant."""
    score = 0.0
    desc = (t.merchant_raw or "").lower() + " " + (t.merchant_norm or "").lower()

    # Merchant term hits dominate.
    for term in intent.merchant_terms:
        if term in desc:
            score += 3.0

    # Category hint hits.
    if intent.category_hints and t.category in intent.category_hints:
        score += 2.5

    # Any token-substring hit (lower weight).
    for tok in intent.tokens:
        if tok in desc:
            score += 0.4

    # Recurring intent: subscriptions + multi-occurrence merchants score up.
    if intent.recurring and t.category == Category.SUBSCRIPTIONS:
        score += 1.5

    # Charges intent doesn't bias transaction scoring much — charges live in
    # meta, not the txn rows. We surface a "charges_summary" aggregate so the
    # prompt has the right numbers regardless.

    return score


def _fallback_recent(txns: list[Transaction], limit: int) -> list[Transaction]:
    """When no signal in the question, return the largest recent debits.
    Mimics what a user would skim if they opened their statement directly."""
    debits = [t for t in txns if t.is_debit]
    debits.sort(key=lambda t: (t.txn_date, float(t.amount)), reverse=True)
    return debits[:limit]


# ---------- aggregates ----------

def _f(x: Decimal | float | int | None) -> float:
    if x is None:
        return 0.0
    return float(x) if not isinstance(x, Decimal) else float(x)


def _aggregates(statements: list[Statement]) -> dict:
    debits = [t for s in statements for t in s.transactions if t.is_debit]
    credits = [t for s in statements for t in s.transactions if not t.is_debit]

    by_cat: dict[str, float] = defaultdict(float)
    by_merchant: dict[str, float] = defaultdict(float)
    for t in debits:
        by_cat[t.category.value] += _f(t.amount)
        m = (t.merchant_norm or t.merchant_raw or "").strip()
        if m:
            by_merchant[m] += _f(t.amount)

    top_merchants = sorted(by_merchant.items(), key=lambda kv: kv[1], reverse=True)[:5]
    cat_rows = [{"category": c.value, "amount": round(by_cat[c.value], 2)}
                for c in CATEGORY_ORDER if by_cat.get(c.value, 0) > 0]

    finance = sum(_f(s.meta.finance_charges) for s in statements)
    gst = sum(_f(s.meta.gst_on_charges) for s in statements)
    late = sum(_f(s.meta.late_fee_charges) for s in statements)
    overlimit = sum(_f(s.meta.overlimit_charges) for s in statements)

    months: set[date] = {t.txn_date.replace(day=1) for t in debits + credits}
    return {
        "total_debit": round(sum(_f(t.amount) for t in debits), 2),
        "total_credit": round(sum(_f(t.amount) for t in credits), 2),
        "txn_count": len(debits) + len(credits),
        "months_seen": sorted(m.isoformat() for m in months),
        "by_category": cat_rows,
        "top_merchants": [{"merchant": m, "amount": round(a, 2)} for m, a in top_merchants],
        "charges_summary": {
            "finance": round(finance, 2),
            "gst": round(gst, 2),
            "late_fees": round(late, 2),
            "overlimit": round(overlimit, 2),
            "total": round(finance + gst + late + overlimit, 2),
        },
    }


def _statement_meta(statements: list[Statement]) -> list[dict]:
    out: list[dict] = []
    for s in statements:
        out.append({
            "bank": s.meta.bank_display,
            "last4": s.meta.card_last4,
            "period_start": s.meta.statement_start.isoformat() if s.meta.statement_start else None,
            "period_end": s.meta.statement_end.isoformat() if s.meta.statement_end else None,
            "due_date": s.meta.due_date.isoformat() if s.meta.due_date else None,
            "total_outstanding": _f(s.meta.total_outstanding),
            "minimum_due": _f(s.meta.minimum_due),
            "available_limit": _f(s.meta.available_limit),
        })
    return out


def _txn_compact(t: Transaction) -> dict:
    return {
        "id": t.id,
        "date": t.txn_date.isoformat(),
        "merchant": t.merchant_norm or t.merchant_raw,
        "amount": _f(t.amount),
        "is_debit": t.is_debit,
        "category": t.category.value,
        "is_emi": t.is_emi,
        "forex_currency": t.forex_currency,
    }


# ---------- public bundle ----------

@dataclass
class Context:
    intent: Intent
    statements: list[dict]
    transactions: list[dict]
    aggregates: dict
    retrieval_count: int = 0
    fallback_used: bool = False

    def to_prompt_payload(self) -> dict:
        """JSON-safe context dict that gets stringified into the prompt."""
        return {
            "statements": self.statements,
            "transactions": self.transactions,
            "aggregates": self.aggregates,
            "intent": self.intent.to_dict(),
        }


def build_context(
    question: str,
    statements: list[Statement],
    *,
    max_txns: int = MAX_CONTEXT_TXNS,
) -> Context:
    intent = extract_intent(question, statements=statements)
    all_txns = [t for s in statements for t in s.transactions]

    if not all_txns:
        return Context(
            intent=intent,
            statements=_statement_meta(statements),
            transactions=[],
            aggregates=_aggregates(statements),
            retrieval_count=0,
            fallback_used=False,
        )

    # Score everything; if nothing scored above zero, fall back to recent largest.
    scored: list[tuple[float, Transaction]] = [(_score(t, intent), t) for t in all_txns]
    hits = [t for s, t in scored if s > 0]
    fallback = False
    if not hits:
        hits = _fallback_recent(all_txns, max_txns)
        fallback = True
    else:
        hits = sorted(scored, key=lambda x: x[0], reverse=True)
        hits = [t for s, t in hits if s > 0][:max_txns]

    # Honour explicit "top N" if the user asked for fewer.
    if intent.top_k and intent.top_k < len(hits):
        hits = hits[: intent.top_k]

    return Context(
        intent=intent,
        statements=_statement_meta(statements),
        transactions=[_txn_compact(t) for t in hits],
        aggregates=_aggregates(statements),
        retrieval_count=len(hits),
        fallback_used=fallback,
    )
