"""
Deterministic signal generators.

Each generator scans the loaded `Statement`s and returns zero or more
`Signal` objects. The intelligence orchestrator (Stage 7) ranks signals
by impact × severity × confidence and then asks the AI gateway to
phrase the top N in plain English.

Every signal has:
  - id         : stable kind (hidden_charges, high_utilization, ...)
  - severity   : 1 / 2 / 3 (3 = most urgent)
  - impact_inr : absolute rupee impact, used for ranking
  - confidence : 0..1
  - category   : ui group ('charges' | 'recurring' | 'utilization' |
                 'anomaly' | 'duplicate' | 'forex' | 'profile_hint')
  - is_suspicious : surfaces in the Suspicious Activity panel
  - raw_title / raw_body / next_step_hint : deterministic English fallback
  - refs       : structured numbers the LLM uses to phrase the card
"""

from __future__ import annotations

import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Iterable

from shared.categories import Category
from shared.schemas import Statement, Transaction


# ---------- types ----------

@dataclass
class Signal:
    id: str
    severity: int                       # 1, 2, 3
    impact_inr: float                   # for ranking
    confidence: float                   # 0..1
    category: str                       # ui group
    raw_title: str                      # rule-engine title (fallback)
    raw_body: str                       # rule-engine body  (fallback)
    next_step_hint: str                 # rule-engine action (fallback)
    refs: dict = field(default_factory=dict)
    is_suspicious: bool = False
    txn_ids: list[str] = field(default_factory=list)

    @property
    def rank_score(self) -> float:
        # log-scaled impact * severity * confidence
        import math
        impact_score = math.log10(max(self.impact_inr, 10.0))
        return impact_score * self.severity * max(self.confidence, 0.1)


def _dec(x) -> Decimal:
    if x is None: return Decimal(0)
    if isinstance(x, Decimal): return x
    return Decimal(str(x))


def _f(x) -> float:
    return float(_dec(x))


def _all_debits(statements: list[Statement]) -> list[Transaction]:
    return [t for s in statements for t in s.transactions if t.is_debit]


# ---------- 1. hidden charges ----------

def hidden_charges(statements: list[Statement]) -> list[Signal]:
    out: list[Signal] = []
    for s in statements:
        fin = _f(s.meta.finance_charges)
        gst = _f(s.meta.gst_on_charges)
        total = fin + gst
        if total <= 0:
            continue
        out.append(Signal(
            id="hidden_charges",
            severity=3 if total > 500 else 2,
            impact_inr=total,
            confidence=0.95,
            category="charges",
            raw_title=f"₹{total:,.0f} in finance charges + GST",
            raw_body=(
                "You carried a balance into this cycle, so the issuer added "
                "finance charges and GST on top."
            ),
            next_step_hint=(
                "Pay the total outstanding (not just minimum due) by next due "
                "date to avoid the same charge next month."
            ),
            refs={
                "finance": fin, "gst": gst, "total": total,
                "bank": s.meta.bank_display, "last4": s.meta.card_last4,
            },
        ))
    return out


# ---------- 2. high utilization ----------

def high_utilization(statements: list[Statement]) -> list[Signal]:
    used = Decimal(0); limit = Decimal(0)
    for s in statements:
        out = _dec(s.meta.total_outstanding)
        lim = _dec(s.meta.available_limit)
        if lim > 0:
            used += out
            limit += out + lim
    if limit == 0:
        return []
    pct = float(used / limit)
    if pct < 0.30:
        return []
    severity = 3 if pct >= 0.70 else 2 if pct >= 0.40 else 1
    return [Signal(
        id="high_utilization",
        severity=severity,
        impact_inr=_f(used) * pct,
        confidence=0.9,
        category="utilization",
        raw_title=f"Credit utilization is {pct*100:.0f}%",
        raw_body=(
            f"You're using ₹{_f(used):,.0f} of your ₹{_f(limit):,.0f} total "
            "limit. Bureaus prefer under 30%."
        ),
        next_step_hint=(
            "Paying down a portion of the outstanding before the statement "
            "date typically lowers reported utilization."
        ),
        refs={"used": _f(used), "limit": _f(limit), "pct": pct},
    )]


# ---------- 3. duplicate charges ----------

def duplicate_charges(statements: list[Statement]) -> list[Signal]:
    debits = _all_debits(statements)
    # Group by (merchant_norm, amount, txn_date)
    groups: dict[tuple, list[Transaction]] = defaultdict(list)
    for t in debits:
        key = (
            (t.merchant_norm or t.merchant_raw).strip().lower(),
            str(_dec(t.amount)),
            t.txn_date,
        )
        groups[key].append(t)

    out: list[Signal] = []
    for (m, amt, d), txns in groups.items():
        if len(txns) < 2:
            continue
        impact = float(_dec(txns[0].amount) * (len(txns) - 1))
        out.append(Signal(
            id="duplicate_charge",
            severity=3,
            impact_inr=impact,
            confidence=0.85,
            category="duplicate",
            is_suspicious=True,
            raw_title=f"Possible duplicate at {txns[0].merchant_raw[:30]}",
            raw_body=(
                f"{len(txns)} identical charges of ₹{impact / (len(txns)-1):,.0f} "
                f"to {txns[0].merchant_raw} on {d.strftime('%d %b')}."
            ),
            next_step_hint=(
                "Open Resolution Assistant to dispute the duplicate. We'll "
                "pre-fill the merchant, amount, and date."
            ),
            refs={"merchant": txns[0].merchant_raw, "count": len(txns),
                  "amount": float(_dec(txns[0].amount)), "date": d.isoformat()},
            txn_ids=[t.id for t in txns],
        ))
    return out


# ---------- 4. large outliers (z-score) ----------

def large_outliers(statements: list[Statement]) -> list[Signal]:
    debits = _all_debits(statements)
    if len(debits) < 5:
        return []
    amounts = [_f(t.amount) for t in debits]
    mu = statistics.median(amounts)
    sigma = statistics.pstdev(amounts) or 1.0
    if sigma <= 0:
        return []
    out: list[Signal] = []
    for t in debits:
        a = _f(t.amount)
        z = (a - mu) / sigma
        if z >= 2.5 and a >= 5000:
            out.append(Signal(
                id="large_outlier",
                severity=2,
                impact_inr=a,
                confidence=min(0.95, 0.5 + z / 10),
                category="anomaly",
                is_suspicious=True,
                raw_title=f"Unusual ₹{a:,.0f} charge at {(t.merchant_norm or t.merchant_raw)[:24]}",
                raw_body=(
                    f"This is notably larger than your typical transaction "
                    f"(median ₹{mu:,.0f}). Worth a quick check."
                ),
                next_step_hint=(
                    "If you don't recognise it, open Resolution Assistant to "
                    "report an unauthorized transaction."
                ),
                refs={"merchant": t.merchant_raw, "amount": a,
                      "median": mu, "z": round(z, 2),
                      "date": t.txn_date.isoformat()},
                txn_ids=[t.id],
            ))
    # Only surface the most extreme outlier so we don't drown the UI.
    out.sort(key=lambda s: s.refs["z"], reverse=True)
    return out[:2]


# ---------- 5. forex / international ----------

def forex_markup(statements: list[Statement]) -> list[Signal]:
    debits = _all_debits(statements)
    fx = [t for t in debits if t.forex_amount and t.forex_currency and t.forex_currency != "INR"]
    if not fx:
        return []
    total = sum(_f(t.amount) for t in fx)
    return [Signal(
        id="forex_markup",
        severity=2,
        impact_inr=total * 0.035,    # ~3.5% typical markup
        confidence=0.7,
        category="forex",
        is_suspicious=False,
        raw_title=f"{len(fx)} forex charge{'s' if len(fx)!=1 else ''} on this card",
        raw_body=(
            f"₹{total:,.0f} of international charges this cycle. "
            "Most Indian credit cards add a 2-3.5% forex markup plus GST."
        ),
        next_step_hint=(
            "If you travel often, a zero-forex-markup card could save you "
            f"~₹{total * 0.035:,.0f} a year on this volume."
        ),
        refs={"count": len(fx), "total": total},
    )]


# ---------- 6. recurring subscriptions ----------

def recurring_summary(statements: list[Statement]) -> list[Signal]:
    debits = _all_debits(statements)
    subs = [t for t in debits if t.category == Category.SUBSCRIPTIONS]
    if not subs:
        return []
    total = sum(_f(t.amount) for t in subs)
    if total < 200:
        return []
    return [Signal(
        id="subscriptions_active",
        severity=1,
        impact_inr=total * 12,    # annual impact for ranking
        confidence=0.85,
        category="recurring",
        raw_title=f"{len(subs)} recurring charges · ₹{total:,.0f}/mo",
        raw_body=(
            "Subscriptions you're paying on this card. Cancelling unused "
            f"ones could free ~₹{total*12:,.0f} a year."
        ),
        next_step_hint=(
            "Review the Subscriptions panel for the full list and one-tap "
            "cancellation emails."
        ),
        refs={"count": len(subs), "monthly": total, "annual": total * 12,
              "merchants": [(t.merchant_norm or t.merchant_raw) for t in subs[:5]]},
    )]


# ---------- 7. category dominance ----------

def category_dominance(statements: list[Statement]) -> list[Signal]:
    debits = _all_debits(statements)
    if not debits:
        return []
    totals: dict[Category, float] = defaultdict(float)
    for t in debits:
        totals[t.category] += _f(t.amount)
    grand = sum(totals.values())
    if grand <= 0:
        return []
    out: list[Signal] = []
    # Skip 'other' — meaningless to flag.
    for cat, amt in totals.items():
        if cat == Category.OTHER:
            continue
        share = amt / grand
        if share >= 0.40 and amt >= 2000:
            out.append(Signal(
                id="category_dominance",
                severity=1,
                impact_inr=amt,
                confidence=0.9,
                category="profile_hint",
                raw_title=f"{cat.value.title()} is {share*100:.0f}% of your spend",
                raw_body=(
                    f"₹{amt:,.0f} went to {cat.value} this cycle. "
                    "A card optimised for this category could earn more rewards."
                ),
                next_step_hint=(
                    "Smart Recommendations will suggest cards that reward "
                    "this category more generously."
                ),
                refs={"category": cat.value, "amount": amt, "share": share},
            ))
    return out


# ---------- 8. weekend skew ----------

def weekend_skew(statements: list[Statement]) -> list[Signal]:
    debits = _all_debits(statements)
    if len(debits) < 10:
        return []
    wknd = sum(_f(t.amount) for t in debits if t.txn_date.weekday() >= 5)
    weekday = sum(_f(t.amount) for t in debits if t.txn_date.weekday() < 5)
    total = wknd + weekday
    if total <= 0:
        return []
    pct_wknd = wknd / total
    # Weekends are 2/7 = 29% of days. Flag if > 50%.
    if pct_wknd < 0.5:
        return []
    return [Signal(
        id="weekend_spender",
        severity=1,
        impact_inr=wknd,
        confidence=0.8,
        category="profile_hint",
        raw_title=f"Weekend spending is {pct_wknd*100:.0f}% of total",
        raw_body=(
            f"₹{wknd:,.0f} of ₹{total:,.0f} happened on Sat/Sun. "
            "Worth knowing when you set a monthly budget."
        ),
        next_step_hint=(
            "If you want a softer weekend, try the 'pause and decide tomorrow' "
            "rule for non-essential weekend purchases."
        ),
        refs={"weekend": wknd, "weekday": weekday, "pct": pct_wknd},
    )]


# ---------- 9. EMI burden ----------

def emi_burden(statements: list[Statement]) -> list[Signal]:
    debits = _all_debits(statements)
    emis = [t for t in debits if t.is_emi]
    if not emis:
        return []
    total_emi = sum(_f(t.amount) for t in emis)
    total_spend = sum(_f(t.amount) for t in debits) or 1
    share = total_emi / total_spend
    if share < 0.20:
        return []
    severity = 3 if share >= 0.50 else 2
    return [Signal(
        id="emi_burden",
        severity=severity,
        impact_inr=total_emi,
        confidence=0.85,
        category="charges",
        raw_title=f"EMIs are {share*100:.0f}% of this month's bill",
        raw_body=(
            f"₹{total_emi:,.0f} of ₹{total_spend:,.0f} is EMI instalments. "
            "These typically carry a processing fee plus interest."
        ),
        next_step_hint=(
            "Open the Resolution Assistant for any EMI closure: prepaying "
            "ahead of schedule can save you significant interest."
        ),
        refs={"emi": total_emi, "spend": total_spend, "share": share, "count": len(emis)},
    )]


# ---------- 10. zero-spend / good-month  (positive signal) ----------

def healthy_cycle(statements: list[Statement]) -> list[Signal]:
    """Counterbalance — only fires if nothing concerning is happening."""
    debits = _all_debits(statements)
    if not debits:
        return []
    fin = sum(_f(s.meta.finance_charges) for s in statements)
    return []  # reserved — Stage 7b can add encouraging signals


# ---------- aggregator ----------

ALL_GENERATORS = [
    hidden_charges,
    high_utilization,
    duplicate_charges,
    large_outliers,
    forex_markup,
    recurring_summary,
    category_dominance,
    weekend_skew,
    emi_burden,
    healthy_cycle,
]


def generate_signals(statements: list[Statement]) -> list[Signal]:
    out: list[Signal] = []
    for gen in ALL_GENERATORS:
        try:
            out.extend(gen(statements))
        except Exception:
            # Never let one generator break the others.
            continue
    return out
