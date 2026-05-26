"""
Rule-based transaction categorizer.

Stage 4: deterministic only — merchant map + regex. Fast, free, and good
enough to power the dashboard. Stage 7 layers an LLM fallback for the
residual (typically <10%) of merchants the rules miss.

Confidence scoring:
  exact merchant-map hit   -> 0.95
  regex pattern hit        -> 0.80
  no rule matched          -> category=OTHER, confidence=0.0
"""

from __future__ import annotations

import re
from typing import Iterable

from shared.categories import Category
from shared.merchants import lookup
from shared.schemas import Transaction

# Coarse regex rules. Tried after the merchant map; first match wins.
_REGEX_RULES: list[tuple[re.Pattern[str], Category]] = [
    (re.compile(r"\b(petrol|fuel|hpcl|iocl|bpcl)\b", re.I), Category.FUEL),
    (re.compile(r"\b(airtel|jio|vodafone|bsnl|vi recharge)\b", re.I), Category.TELECOM),
    (re.compile(r"\b(electric|gas|water|bescom|adani electric)\b", re.I), Category.UTILITIES),
    (re.compile(r"\b(uber|ola|rapido|irctc|indigo|vistara|spicejet|airindia|makemytrip|yatra|ixigo)\b", re.I), Category.TRAVEL),
    (re.compile(r"\b(swiggy|zomato|dominos|kfc|mcdonalds|starbucks)\b", re.I), Category.FOOD),
    (re.compile(r"\b(blinkit|zepto|bigbasket|instamart|dmart|reliance fresh|grofers)\b", re.I), Category.GROCERIES),
    (re.compile(r"\b(amazon|flipkart|myntra|ajio|nykaa|meesho|tatacliq)\b", re.I), Category.SHOPPING),
    (re.compile(r"\b(netflix|spotify|prime video|hotstar|sony liv|zee5|youtube premium)\b", re.I), Category.SUBSCRIPTIONS),
    (re.compile(r"\b(1mg|pharmeasy|apollo|practo|netmeds)\b", re.I), Category.HEALTHCARE),
    (re.compile(r"\b(policybazaar|acko|hdfc ergo|sbi life|lic)\b", re.I), Category.INSURANCE),
    (re.compile(r"\b(zerodha|groww|upstox|kuvera|mutual fund|sip\b)\b", re.I), Category.INVESTMENT),
    (re.compile(r"\b(dream11|mpl|rummy|gaming)\b", re.I), Category.GAMING),
    (re.compile(r"\b(emi|equated)\b", re.I), Category.EMI),
]


def categorize(merchant: str) -> tuple[Category, float]:
    """Return (category, confidence)."""
    if not merchant:
        return Category.OTHER, 0.0
    # 1) merchant map (substring, longest-key-first)
    cat = lookup(merchant)
    if cat:
        return cat, 0.95
    # 2) regex rules
    for pat, c in _REGEX_RULES:
        if pat.search(merchant):
            return c, 0.80
    return Category.OTHER, 0.0


def categorize_transactions(txns: Iterable[Transaction]) -> list[Transaction]:
    out: list[Transaction] = []
    for t in txns:
        cat, conf = categorize(t.merchant_raw or "")
        # Tag EMI by descriptive phrase too.
        if t.is_emi and cat == Category.OTHER:
            cat, conf = Category.EMI, 0.9
        out.append(t.model_copy(update={"category": cat, "category_confidence": conf}))
    return out
