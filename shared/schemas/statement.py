"""Normalized statement schema (one PDF → one Statement)."""

from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from shared.schemas.transaction import Transaction


class StatementMeta(BaseModel):
    bank_id: str
    bank_display: str
    card_last4: Optional[str] = Field(None, pattern=r"^\d{4}$")
    statement_start: Optional[date] = None
    statement_end: Optional[date] = None
    due_date: Optional[date] = None
    total_outstanding: Optional[Decimal] = None
    minimum_due: Optional[Decimal] = None
    available_limit: Optional[Decimal] = None
    finance_charges: Optional[Decimal] = None
    gst_on_charges: Optional[Decimal] = None
    detection_confidence: float = Field(0.0, ge=0.0, le=1.0)
    ocr_used: bool = False
    pages: int = 0


class Statement(BaseModel):
    meta: StatementMeta
    transactions: list[Transaction] = []
