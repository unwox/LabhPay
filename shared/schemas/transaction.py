"""Normalized transaction schema. Bank-agnostic."""

from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from shared.categories import Category


class Transaction(BaseModel):
    """One row from a credit card statement, normalized."""

    id: str = Field(..., description="Stable hash of (date, merchant, amount, ref)")
    txn_date: date
    posting_date: Optional[date] = None
    merchant_raw: str = Field(..., description="As-printed merchant string")
    merchant_norm: Optional[str] = Field(None, description="Cleaned merchant name")
    amount: Decimal = Field(..., description="Positive value in INR")
    is_debit: bool = Field(True, description="False for credits/refunds/reversals")
    currency: str = "INR"
    forex_amount: Optional[Decimal] = None
    forex_currency: Optional[str] = None
    reward_points: Optional[int] = None
    is_emi: bool = False
    category: Category = Category.OTHER
    category_confidence: float = Field(0.0, ge=0.0, le=1.0)
    extraction_confidence: float = Field(0.0, ge=0.0, le=1.0)
    note: Optional[str] = None
