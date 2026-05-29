"""
Shared parsing primitives used by every bank parser.

Indian credit card statements vary wildly but the *shapes* are the same:
- A header block with the issuer name and a masked card number.
- A summary box: total outstanding, minimum due, due date, available limit.
- A transactions table: date | description | amount (+ Cr/Dr).
- A charges block: finance charges, GST.

We extract using best-effort regex with confidence tracking. Real-world
tuning happens once we have actual PDFs in hand — these patterns are
covering the most common layouts seen across HDFC/SBI/ICICI.
"""

from __future__ import annotations

import hashlib
import re
from datetime import date, datetime
from decimal import Decimal
from typing import Iterable, Optional

from shared.categories import Category
from shared.schemas import Statement, StatementMeta, Transaction
from utils.masking import last4_from_pan

# ----- numeric / date patterns -----

# Indian number with optional trailing flag, e.g. "12,345.67 Cr", "344.00 D",
# "21,937.00 C", "8,709.18 M". SBI Card uses single-letter D/C/M (Debit /
# Credit / Monthly-EMI); HDFC/ICICI use "Dr"/"Cr". We accept both forms.
_AMOUNT = r"(?P<amt>[\d,]+\.\d{2})\s*(?P<flag>Cr|CR|cr|Dr|DR|dr|C|D|M)?"

# Field-style amount: the number must start at a digit boundary (so we never
# match a fragment of a larger number, e.g. ".00" out of "51,773.00"), and
# must NOT be a percentage (so rate disclosures like "Finance Charges 3.75%
# p.m." don't poison the finance_charges meta field).
_FIELD_AMOUNT = r"(?<![\d.,])(?P<amt>[\d,]+\.\d{2})(?!\s*%)"
# Date forms: 12/06/2024 · 12-06-2024 · 12 Jun 2024 · 12-Jun-24
_DATE_FORMATS = [
    "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y",
    "%d %b %Y", "%d-%b-%Y", "%d %b %y", "%d-%b-%y",
    "%d %B %Y", "%d-%B-%Y",
]
_DATE_RE = re.compile(
    r"\b(\d{1,2}[/-][A-Za-z0-9]{2,4}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b"
)

# Transaction row heuristic:
#   <date>  <description (non-greedy)>  <amount> [Cr|Dr]?
_TXN_LINE = re.compile(
    r"^(?P<date>\d{1,2}[/-][A-Za-z0-9]{2,4}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})"
    r"\s{1,40}"
    r"(?P<desc>.{3,80}?)"
    r"\s{1,12}"
    + _AMOUNT
    + r"\s*$",
    re.MULTILINE,
)

_CARD_LAST4 = re.compile(r"\b(?:\d[\s-]?){12,15}\d{4}\b")

_KEY_FIELD_PATTERNS: dict[str, re.Pattern[str]] = {
    "total_outstanding": re.compile(
        r"(?:Total\s+(?:Outstanding|Amount\s+Due|Due)|Statement\s+Balance)[^A-Za-z\n]{0,30}?\n?[^A-Za-z\n]{0,30}?"
        + _FIELD_AMOUNT,
        re.IGNORECASE,
    ),
    "minimum_due": re.compile(
        r"(?:Minimum\s+(?:Amount\s+)?Due|Min\.?\s+(?:Amount\s+)?Due)[^A-Za-z\n]{0,30}?\n?[^A-Za-z\n]{0,30}?"
        + _FIELD_AMOUNT,
        re.IGNORECASE,
    ),
    "available_limit": re.compile(
        r"(?:Available\s+Credit\s+Limit|Available\s+Limit)[^A-Za-z\n]{0,30}?\n?[^A-Za-z\n]{0,30}?"
        + _FIELD_AMOUNT,
        re.IGNORECASE,
    ),
    "finance_charges": re.compile(
        r"(?:Finance\s+Charges?|Interest\s+Charges?)[^A-Za-z\n]{0,30}?\n?[^A-Za-z\n]{0,30}?"
        + _FIELD_AMOUNT,
        re.IGNORECASE,
    ),
    "gst_on_charges": re.compile(
        r"(?:GST|IGST|CGST.*SGST|Tax\s+on\s+(?:Charges|Interest))[^A-Za-z\n]{0,30}?\n?[^A-Za-z\n]{0,30}?"
        + _FIELD_AMOUNT,
        re.IGNORECASE,
    ),
    "late_fee_charges": re.compile(
        r"(?:Late\s+(?:Payment\s+)?Fee|Late\s+Charges?|Penal\s+Charges?)[^A-Za-z\n]{0,30}?\n?[^A-Za-z\n]{0,30}?"
        + _FIELD_AMOUNT,
        re.IGNORECASE,
    ),
    "overlimit_charges": re.compile(
        r"(?:Over[- ]?Limit\s+(?:Fee|Charges?)|Overlimit\s+Fee)[^A-Za-z\n]{0,30}?\n?[^A-Za-z\n]{0,30}?"
        + _FIELD_AMOUNT,
        re.IGNORECASE,
    ),
}

_DUE_DATE_RE = re.compile(
    r"(?:Payment\s+Due\s+Date|Due\s+Date)[^A-Za-z\n]{0,30}\n?[^A-Za-z\n]{0,30}?"
    r"(\d{1,2}[/-][A-Za-z0-9]{2,4}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})",
    re.IGNORECASE,
)


def parse_amount(s: str) -> Decimal:
    return Decimal(s.replace(",", ""))


def parse_date(s: str) -> Optional[date]:
    if not s:
        return None
    s = s.strip().replace(",", "")
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def find_card_last4(text: str) -> Optional[str]:
    m = _CARD_LAST4.search(text)
    if not m:
        return None
    return last4_from_pan(m.group(0))


def find_due_date(text: str) -> Optional[date]:
    m = _DUE_DATE_RE.search(text)
    return parse_date(m.group(1)) if m else None


def find_field_amount(text: str, field: str) -> Optional[Decimal]:
    pat = _KEY_FIELD_PATTERNS[field]
    m = pat.search(text)
    return parse_amount(m.group("amt")) if m else None


_EMI_DESC_RE = re.compile(
    r"\b(emi|equated|flexipay|fp\s*emi|easy\s*emi|installment|"
    r"pay\s*in\s*emis?|encash)\b",
    re.IGNORECASE,
)


def iter_transaction_lines(text: str) -> Iterable[Transaction]:
    """Yield Transaction rows extracted via regex on raw text."""
    for m in _TXN_LINE.finditer(text):
        d = parse_date(m.group("date"))
        if not d:
            continue
        amt = parse_amount(m.group("amt"))
        # Credit markers: "Cr"/"CR"/"C" (SBI uses single-letter "C").
        # Everything else (Dr/DR/D/M/no-flag) is a debit. "M" = monthly EMI
        # debit on SBI Card.
        flag = (m.group("flag") or "").lower()
        is_debit = flag not in ("cr", "c")
        desc = re.sub(r"\s+", " ", m.group("desc")).strip()
        # SBI marks monthly EMI installments with trailing "M" flag; banks
        # also embed "EMI" / "Flexipay" / "Pay in EMIs" in the description.
        is_emi = flag == "m" or bool(_EMI_DESC_RE.search(desc))
        # Skip obviously-not-transactions (totals, headers).
        if not desc or any(kw in desc.lower() for kw in (
            "total", "minimum", "due", "outstanding", "available", "carried"
        )):
            continue
        h = hashlib.sha1(
            f"{d.isoformat()}|{desc}|{amt}".encode(), usedforsecurity=False
        ).hexdigest()[:16]
        yield Transaction(
            id=h,
            txn_date=d,
            merchant_raw=desc,
            merchant_norm=desc.title(),
            amount=amt,
            is_debit=is_debit,
            is_emi=is_emi,
            category=Category.OTHER,
            extraction_confidence=0.7,
            category_confidence=0.0,
        )


def build_meta(
    *,
    bank_id: str,
    bank_display: str,
    text: str,
    pages: int,
    ocr_used: bool = False,
    detection_confidence: float = 0.0,
) -> StatementMeta:
    return StatementMeta(
        bank_id=bank_id,
        bank_display=bank_display,
        card_last4=find_card_last4(text),
        due_date=find_due_date(text),
        total_outstanding=find_field_amount(text, "total_outstanding"),
        minimum_due=find_field_amount(text, "minimum_due"),
        available_limit=find_field_amount(text, "available_limit"),
        finance_charges=find_field_amount(text, "finance_charges"),
        gst_on_charges=find_field_amount(text, "gst_on_charges"),
        late_fee_charges=find_field_amount(text, "late_fee_charges"),
        overlimit_charges=find_field_amount(text, "overlimit_charges"),
        detection_confidence=detection_confidence,
        ocr_used=ocr_used,
        pages=pages,
    )


def fingerprint_score(text: str, *, must: list[str], should: list[str]) -> float:
    """
    Cheap fingerprint scorer. `must` patterns are required; each contributes
    0.6 / len(must). `should` patterns add 0.4 / len(should) each as bonus.
    Result is clamped to [0, 1]. Case-insensitive.
    """
    lc = text.lower()
    if not all(m.lower() in lc for m in must):
        return 0.0
    base = 0.6
    bonus = sum(0.4 / max(1, len(should)) for s in should if s.lower() in lc)
    return min(1.0, base + bonus)


class BaseRegexParser:
    bank_id: str = "unknown"
    display_name: str = "Unknown"
    must: list[str] = []
    should: list[str] = []

    def fingerprint(self, text: str) -> float:
        return fingerprint_score(text, must=self.must, should=self.should)

    def parse(self, text: str, tables: list) -> Statement:  # noqa: ARG002
        meta = build_meta(
            bank_id=self.bank_id,
            bank_display=self.display_name,
            text=text,
            pages=text.count("\f") + 1,
            detection_confidence=self.fingerprint(text),
        )
        txns = list(iter_transaction_lines(text))
        return Statement(meta=meta, transactions=txns)
