"""
Spending Profile generator.

Each profile tag has a deterministic scorer (0..1). Tags with score > 0.5
are returned. We cap at 3 to keep the UI calm.

Tags shipped in Stage 7:
  - smart_saver       Many credits, paying in full, low utilization
  - weekend_spender   Heavy Sat/Sun share
  - reward_optimizer  Concentrated spend in reward-friendly categories
  - emi_heavy_user    EMI instalments dominate the bill
  - impulse_buyer     Many small (<₹500) shopping transactions
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal

from shared.categories import Category
from shared.schemas import Statement


# ---------- types ----------

@dataclass
class ProfileTag:
    id: str
    title: str
    body: str
    score: float           # 0..1
    icon: str              # lucide-react icon name


def _f(x) -> float:
    if x is None: return 0.0
    if isinstance(x, Decimal): return float(x)
    return float(Decimal(str(x)))


# ---------- scorers ----------

def _score_smart_saver(statements: list[Statement]) -> float:
    debits = sum(_f(t.amount) for s in statements for t in s.transactions if t.is_debit)
    credits = sum(_f(t.amount) for s in statements for t in s.transactions if not t.is_debit)
    finance = sum(_f(s.meta.finance_charges) for s in statements)
    if debits == 0:
        return 0.0

    # Three signals, equally weighted:
    paying_in_full = 1.0 if finance == 0 else max(0.0, 1.0 - finance / max(debits, 1))
    credit_ratio = min(1.0, credits / max(debits, 1))   # >100% credits = full payer

    util_used = sum(_f(s.meta.total_outstanding) for s in statements)
    util_limit = sum(_f(s.meta.total_outstanding) + _f(s.meta.available_limit) for s in statements)
    util_pct = (util_used / util_limit) if util_limit > 0 else 0.5
    util_score = max(0.0, 1.0 - util_pct / 0.3)         # 1.0 if util<=0%, 0 at 30%

    return min(1.0, (paying_in_full + credit_ratio + util_score) / 3)


def _score_weekend_spender(statements: list[Statement]) -> float:
    debits = [t for s in statements for t in s.transactions if t.is_debit]
    if len(debits) < 6:
        return 0.0
    wknd = sum(_f(t.amount) for t in debits if t.txn_date.weekday() >= 5)
    total = sum(_f(t.amount) for t in debits) or 1
    pct = wknd / total
    # 29% is the neutral baseline (Sat+Sun share of days). Map 29% -> 0, 60% -> 1.
    return max(0.0, min(1.0, (pct - 0.29) / 0.31))


def _score_reward_optimizer(statements: list[Statement]) -> float:
    debits = [t for s in statements for t in s.transactions if t.is_debit]
    if not debits:
        return 0.0
    totals: dict[Category, float] = defaultdict(float)
    grand = 0.0
    for t in debits:
        totals[t.category] += _f(t.amount)
        grand += _f(t.amount)
    if grand <= 0:
        return 0.0
    # Concentration in reward-friendly categories.
    reward_cats = {Category.FUEL, Category.TRAVEL, Category.SHOPPING, Category.FOOD, Category.GROCERIES}
    top = sum(amt for c, amt in totals.items() if c in reward_cats)
    share = top / grand
    # Also bonus for having reward points line.
    points = sum((t.reward_points or 0) for t in debits)
    points_bonus = min(0.3, points / 5000)
    return min(1.0, share + points_bonus)


def _score_emi_heavy_user(statements: list[Statement]) -> float:
    debits = [t for s in statements for t in s.transactions if t.is_debit]
    total = sum(_f(t.amount) for t in debits) or 1
    emi = sum(_f(t.amount) for t in debits if t.is_emi)
    return min(1.0, (emi / total) / 0.5)   # 50%+ EMIs -> score 1.0


def _score_impulse_buyer(statements: list[Statement]) -> float:
    debits = [t for s in statements for t in s.transactions if t.is_debit]
    if len(debits) < 5:
        return 0.0
    small_shopping = [t for t in debits if t.category in {Category.SHOPPING, Category.FOOD} and _f(t.amount) < 500]
    if not small_shopping:
        return 0.0
    # Frequency vs total transactions, scaled.
    share = len(small_shopping) / len(debits)
    return min(1.0, share / 0.4)   # 40%+ small shopping -> 1.0


# ---------- public ----------

_TAGS = [
    ("smart_saver",       "Smart Saver",
     "Pays in full, keeps utilization low, makes the most of credits and refunds.",
     "Sparkles", _score_smart_saver),
    ("reward_optimizer",  "Reward Optimizer",
     "Concentrated spend in reward-friendly categories. A category-specialist card might earn you more.",
     "Award", _score_reward_optimizer),
    ("weekend_spender",   "Weekend Spender",
     "More than half of the spend lands on Sat or Sun. Worth knowing when budgeting.",
     "CalendarDays", _score_weekend_spender),
    ("emi_heavy_user",    "EMI Heavy User",
     "EMIs are a meaningful share of the bill. Watch out for processing fees and interest.",
     "Receipt", _score_emi_heavy_user),
    ("impulse_buyer",     "Impulse Buyer",
     "Many small food/shopping charges suggest unplanned purchases. The pause-and-decide rule helps.",
     "ShoppingBag", _score_impulse_buyer),
]


def profile_tags(statements: list[Statement], *, threshold: float = 0.5, limit: int = 3) -> list[ProfileTag]:
    if not statements:
        return []
    scored: list[ProfileTag] = []
    for tid, title, body, icon, scorer in _TAGS:
        try:
            s = scorer(statements)
        except Exception:
            s = 0.0
        if s >= threshold:
            scored.append(ProfileTag(id=tid, title=title, body=body, score=round(s, 3), icon=icon))
    scored.sort(key=lambda t: t.score, reverse=True)
    return scored[:limit]
