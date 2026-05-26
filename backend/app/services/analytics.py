"""
Multi-statement analytics aggregator.

Pure functions over `Statement` objects — no IO. The dashboard API
gathers statements from Redis and hands them in. Keeps the aggregator
trivially unit-testable.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Iterable

from shared.categories import CATEGORY_ORDER, Category
from shared.schemas import Statement, Transaction

# Substrings that strongly indicate a recurring (subscription-like) charge.
_RECURRING_KEYWORDS = re.compile(
    r"\b(subscription|subs|membership|premium|prime|monthly|recurring|"
    r"renewal|plan|sub\.|auto[- ]?pay)\b",
    re.IGNORECASE,
)


def _dec(x) -> Decimal:
    """Coerce mixed numeric inputs to Decimal."""
    if x is None:
        return Decimal(0)
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def _quant(d: Decimal) -> float:
    return float(d.quantize(Decimal("0.01")))


# ---------------- by-category ----------------

def by_category(txns: Iterable[Transaction]) -> list[dict]:
    totals: dict[Category, Decimal] = defaultdict(lambda: Decimal(0))
    counts: dict[Category, int] = defaultdict(int)
    for t in txns:
        if not t.is_debit:
            continue  # credits/refunds don't count as spending
        totals[t.category] += _dec(t.amount)
        counts[t.category] += 1
    grand = sum(totals.values(), Decimal(0))
    out: list[dict] = []
    for cat in CATEGORY_ORDER:
        if totals.get(cat, Decimal(0)) == 0:
            continue
        amt = totals[cat]
        out.append({
            "category": cat.value,
            "amount": _quant(amt),
            "count": counts[cat],
            "pct": float(amt / grand) if grand > 0 else 0.0,
        })
    out.sort(key=lambda r: r["amount"], reverse=True)
    return out


# ---------------- top merchants ----------------

def top_merchants(txns: Iterable[Transaction], *, limit: int = 6) -> list[dict]:
    totals: dict[str, Decimal] = defaultdict(lambda: Decimal(0))
    counts: dict[str, int] = defaultdict(int)
    cats: dict[str, Category] = {}
    for t in txns:
        if not t.is_debit:
            continue
        key = (t.merchant_norm or t.merchant_raw).strip()
        if not key:
            continue
        totals[key] += _dec(t.amount)
        counts[key] += 1
        cats.setdefault(key, t.category)
    rows = [
        {
            "merchant": k,
            "amount": _quant(v),
            "count": counts[k],
            "category": cats[k].value,
        }
        for k, v in totals.items()
    ]
    rows.sort(key=lambda r: r["amount"], reverse=True)
    return rows[:limit]


# ---------------- recurring detection ----------------

def detect_recurring(txns: Iterable[Transaction]) -> list[dict]:
    """
    A merchant is considered recurring if any of:
      (a) it's tagged SUBSCRIPTIONS,
      (b) its description contains a recurring keyword, or
      (c) it appears in >= 2 distinct months with similar amounts (when
          multiple statements are loaded).
    """
    by_merchant: dict[str, list[Transaction]] = defaultdict(list)
    for t in txns:
        if not t.is_debit:
            continue
        by_merchant[(t.merchant_norm or t.merchant_raw).strip()].append(t)

    out: list[dict] = []
    for merchant, group in by_merchant.items():
        if not merchant:
            continue
        cat = group[0].category
        sample_desc = (group[0].merchant_raw or "")
        is_subs_cat = cat == Category.SUBSCRIPTIONS
        is_kw = bool(_RECURRING_KEYWORDS.search(sample_desc))
        months = {t.txn_date.replace(day=1) for t in group}
        is_multi_month = len(months) >= 2

        if not (is_subs_cat or is_kw or is_multi_month):
            continue

        # If multi-month, monthly_amount = median of group amounts; else min/typical.
        amounts = sorted(_dec(t.amount) for t in group)
        monthly = amounts[len(amounts) // 2]

        out.append({
            "merchant": merchant,
            "monthly_amount": _quant(monthly),
            "category": cat.value,
            "occurrences": len(group),
            "months_seen": len(months),
            "reason": (
                "multi-month" if is_multi_month
                else "category" if is_subs_cat
                else "description"
            ),
        })
    out.sort(key=lambda r: r["monthly_amount"], reverse=True)
    return out


# ---------------- hidden charges + EMI + utilization ----------------

def hidden_charges(statements: list[Statement]) -> dict:
    finance = sum((_dec(s.meta.finance_charges) for s in statements), Decimal(0))
    gst = sum((_dec(s.meta.gst_on_charges) for s in statements), Decimal(0))
    late = sum((_dec(s.meta.late_fee_charges) for s in statements), Decimal(0))
    overlimit = sum((_dec(s.meta.overlimit_charges) for s in statements), Decimal(0))
    total = finance + gst + late + overlimit
    return {
        "finance": _quant(finance),
        "gst": _quant(gst),
        "late_fees": _quant(late),
        "overlimit": _quant(overlimit),
        "total": _quant(total),
        "has_any": bool(total > 0),
    }


def emi_burden(txns: Iterable[Transaction]) -> dict:
    rows = [t for t in txns if t.is_emi and t.is_debit]
    total = sum((_dec(t.amount) for t in rows), Decimal(0))
    return {"total": _quant(total), "count": len(rows)}


def utilization(statements: list[Statement]) -> dict | None:
    """Estimate used / total credit limit across all available statements."""
    used = Decimal(0)
    limit = Decimal(0)
    seen_any_limit = False
    for s in statements:
        out = _dec(s.meta.total_outstanding)
        lim = _dec(s.meta.available_limit)
        if lim > 0:
            seen_any_limit = True
            # available + used = total
            limit += out + lim
            used += out
    if not seen_any_limit or limit == 0:
        return None
    pct = float(used / limit)
    return {
        "used": _quant(used),
        "limit": _quant(limit),
        "pct": pct,
        "tone": "high" if pct >= 0.7 else "medium" if pct >= 0.4 else "low",
    }


# ---------------- monthly trend ----------------

def monthly_trend(txns: Iterable[Transaction]) -> list[dict]:
    buckets: dict[date, Decimal] = defaultdict(lambda: Decimal(0))
    for t in txns:
        if not t.is_debit:
            continue
        buckets[t.txn_date.replace(day=1)] += _dec(t.amount)
    keys = sorted(buckets.keys())
    return [{"month": k.isoformat(), "total": _quant(buckets[k])} for k in keys]


# ---------------- statements list ----------------

def statements_list(statements: list[Statement]) -> list[dict]:
    return [
        {
            "bank_id": s.meta.bank_id,
            "bank_display": s.meta.bank_display,
            "card_last4": s.meta.card_last4,
            "period_start": s.meta.statement_start.isoformat() if s.meta.statement_start else None,
            "period_end": s.meta.statement_end.isoformat() if s.meta.statement_end else None,
            "due_date": s.meta.due_date.isoformat() if s.meta.due_date else None,
            "total_outstanding": _quant(_dec(s.meta.total_outstanding)),
            "minimum_due": _quant(_dec(s.meta.minimum_due)),
            "detection_confidence": s.meta.detection_confidence,
            "pages": s.meta.pages,
            "txn_count": len(s.transactions),
        }
        for s in statements
    ]


# ---------------- confidence aggregation ----------------

def confidence_badges(statements: list[Statement]) -> dict:
    """Headline confidence: lowest field confidence across statements."""
    if not statements:
        return {"extraction": "none", "categorization": "none"}
    ex_conf = min(s.meta.detection_confidence or 0 for s in statements)
    cat_conf_values = [t.category_confidence for s in statements for t in s.transactions]
    cat_conf = sum(cat_conf_values) / len(cat_conf_values) if cat_conf_values else 0.0
    def grade(x: float) -> str:
        return "high" if x >= 0.85 else "medium" if x >= 0.5 else "low"
    return {
        "extraction": grade(ex_conf),
        "categorization": grade(cat_conf),
        "extraction_score": round(ex_conf, 3),
        "categorization_score": round(cat_conf, 3),
    }


# ---------------- top-level summary ----------------

@dataclass
class Summary:
    total_spending: float
    total_credits: float
    txn_count: int
    by_category: list[dict]
    top_merchants: list[dict]
    recurring: list[dict]
    hidden_charges: dict
    emi: dict
    utilization: dict | None
    monthly_trend: list[dict]
    statements: list[dict]
    confidence: dict

    def to_dict(self) -> dict:
        return {
            "total_spending": self.total_spending,
            "total_credits": self.total_credits,
            "txn_count": self.txn_count,
            "by_category": self.by_category,
            "top_merchants": self.top_merchants,
            "recurring": self.recurring,
            "hidden_charges": self.hidden_charges,
            "emi": self.emi,
            "utilization": self.utilization,
            "monthly_trend": self.monthly_trend,
            "statements": self.statements,
            "confidence": self.confidence,
        }


def summarize(statements: list[Statement]) -> Summary:
    all_txns = [t for s in statements for t in s.transactions]
    debits = [t for t in all_txns if t.is_debit]
    credits = [t for t in all_txns if not t.is_debit]
    return Summary(
        total_spending=_quant(sum((_dec(t.amount) for t in debits), Decimal(0))),
        total_credits=_quant(sum((_dec(t.amount) for t in credits), Decimal(0))),
        txn_count=len(all_txns),
        by_category=by_category(all_txns),
        top_merchants=top_merchants(all_txns),
        recurring=detect_recurring(all_txns),
        hidden_charges=hidden_charges(statements),
        emi=emi_burden(all_txns),
        utilization=utilization(statements),
        monthly_trend=monthly_trend(all_txns),
        statements=statements_list(statements),
        confidence=confidence_badges(statements),
    )
