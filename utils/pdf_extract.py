"""
PDF text extraction helpers. Used by the worker pipeline.

Strategy:
  1. Detect encryption first (cheap, via PyMuPDF). Raise PdfPasswordRequired
     up-front so the caller can prompt the user.
  2. Run BOTH pdfplumber and PyMuPDF against the bytes.
  3. Score each output for "Indian credit-card statement signal" — date
     density, INR-amount density, presence of well-known statement labels,
     and a penalty for column-mashing (which is what pdfplumber does to
     modern HDFC layouts).
  4. Return the higher-scoring result. Fall back to whichever ran, and
     finally raise PdfUnreadable if nothing extracted any text.

Why scoring instead of "pdfplumber first, fall back"? Modern HDFC
statements (and a few SBI Card variants) render their summary block as
label-on-one-line / value-on-next-line. pdfplumber's table heuristics
stitch those into a single wide horizontal row that loses the label→value
pairing our parsers depend on. PyMuPDF keeps the original vertical
ordering and the parsers can walk it. Older statements go the other way —
pdfplumber's table extraction is strictly better when there's an actual
ruled table. Scoring lets the same code path handle both.

We return ExtractResult(text, pages, ocr_used, source). Raises
`PdfPasswordRequired` on encrypted PDFs and `PdfUnreadable` if no
extractor produced usable text.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass
from typing import Optional


class PdfPasswordRequired(Exception):
    """Raised when the PDF is encrypted and we have no password."""


class PdfUnreadable(Exception):
    """Raised when no extractor can read the file."""


@dataclass
class ExtractResult:
    text: str
    pages: int
    ocr_used: bool
    source: str  # which library produced the text
    score: float = 0.0  # signal score from _score_text; 0.0 if unscored


# ---------- extractor wrappers ----------


def _try_pdfplumber(data: bytes, password: Optional[str]) -> Optional[ExtractResult]:
    try:
        import pdfplumber  # type: ignore
    except ImportError:
        return None
    try:
        with pdfplumber.open(io.BytesIO(data), password=password or "") as pdf:
            pages = []
            for p in pdf.pages:
                pages.append(p.extract_text() or "")
        text = "\f".join(pages)
        if not text.strip():
            return None
        return ExtractResult(text=text, pages=len(pages), ocr_used=False, source="pdfplumber")
    except Exception:  # password issues raise here too
        return None


def _try_pymupdf(data: bytes, password: Optional[str]) -> Optional[ExtractResult]:
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return None
    doc = None
    try:
        doc = fitz.open(stream=data, filetype="pdf")
        if doc.needs_pass:
            if not password or not doc.authenticate(password):
                raise PdfPasswordRequired()
        pages_text = []
        for page in doc:
            pages_text.append(page.get_text("text"))
        text = "\f".join(pages_text)
        if not text.strip():
            return None
        return ExtractResult(text=text, pages=len(pages_text), ocr_used=False, source="pymupdf")
    except PdfPasswordRequired:
        raise
    except Exception:
        return None
    finally:
        if doc is not None:
            doc.close()


# ---------- scoring ----------

# Date tokens commonly found on Indian statements.
_SCORE_DATE = re.compile(
    r"\b\d{1,2}[/-][A-Za-z0-9]{2,4}[/-]\d{2,4}\b"
    r"|\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}\b"
)

# Amounts: 12,345.67 with optional rupee glyph / Cr / Dr / C / D suffix.
# The modern HDFC "C 30,354.00" glyph counts here.
_SCORE_AMOUNT = re.compile(
    r"(?:[₹C]\s*|Rs\.?\s*)?\d{1,3}(?:,\d{2,3})*\.\d{2}(?:\s*(?:Cr|CR|cr|Dr|DR|dr|C|D|M))?\b"
)

# Statement-shape labels. Each hit is strong evidence we're looking at a
# parseable statement page (rather than a marketing page that pdfplumber
# happened to OCR cleanly).
_SCORE_LABELS = [
    re.compile(r"\bTotal\s+Amount\s+Due\b", re.IGNORECASE),
    re.compile(r"\bMinimum\s+(?:Amount\s+)?Due\b", re.IGNORECASE),
    re.compile(r"\bPayment\s+Due\s+Date\b", re.IGNORECASE),
    re.compile(r"\bStatement\s+Date\b", re.IGNORECASE),
    re.compile(r"\bCredit\s+Card\s+(?:No|Number|Statement)\b", re.IGNORECASE),
    re.compile(r"\bAvailable\s+Credit\s+Limit\b", re.IGNORECASE),
    re.compile(r"\bDomestic\s+Transactions?\b", re.IGNORECASE),
    re.compile(r"\bInternational\s+Transactions?\b", re.IGNORECASE),
    re.compile(r"\bReward\s+Points?\b", re.IGNORECASE),
    re.compile(r"\bFinance\s+Charges?\b", re.IGNORECASE),
]

# Lines wider than this are a strong sign of column-mashing — pdfplumber
# stitching a multi-column layout into one row. A few of these are fine;
# many of them tank parseability.
_MASH_WIDTH = 180


def _score_text(text: str) -> float:
    """
    Score extracted text for credit-card-statement parseability.

    Components (all additive, all >= 0 except the penalty):
      labels:       +5 per distinct label found (capped at 10)
      dates:        +1 per match, capped at 40
      amounts:      +1 per match, capped at 60
      mash_penalty: -2 per ultra-wide line (caps at -40)

    Tuning notes:
      - Labels dominate. A page with "Total Amount Due / Minimum Due /
        Payment Due Date" present is almost certainly the summary page we
        need, regardless of how many amounts the other extractor found.
      - The mash penalty is what tips PyMuPDF over pdfplumber on the
        modern HDFC layout. pdfplumber emits lines >200 chars there.
    """
    if not text:
        return 0.0

    label_hits = 0
    for pat in _SCORE_LABELS:
        if pat.search(text):
            label_hits += 1
    label_score = min(label_hits, 10) * 5.0

    date_count = len(_SCORE_DATE.findall(text))
    date_score = float(min(date_count, 40))

    amount_count = len(_SCORE_AMOUNT.findall(text))
    amount_score = float(min(amount_count, 60))

    mash_lines = sum(1 for ln in text.splitlines() if len(ln) > _MASH_WIDTH)
    mash_penalty = -float(min(mash_lines * 2, 40))

    return label_score + date_score + amount_score + mash_penalty


# ---------- public API ----------


def is_password_protected(data: bytes) -> bool:
    """Cheap probe without attempting full extraction."""
    try:
        import fitz
    except ImportError:
        # Fallback: check the PDF /Encrypt object marker
        return b"/Encrypt" in data[:8192] or b"/Encrypt" in data
    try:
        doc = fitz.open(stream=data, filetype="pdf")
        try:
            return bool(doc.needs_pass)
        finally:
            doc.close()
    except Exception:
        return False


def extract_text(data: bytes, *, password: Optional[str] = None) -> ExtractResult:
    """
    Run both extractors, score them, and return the higher-scoring result.

    Raises PdfPasswordRequired when the PDF is locked and no usable
    password was supplied. Raises PdfUnreadable if neither extractor
    produced any text.
    """
    if is_password_protected(data) and not password:
        raise PdfPasswordRequired()

    results: list[ExtractResult] = []

    plumber = _try_pdfplumber(data, password)
    if plumber is not None:
        plumber.score = _score_text(plumber.text)
        results.append(plumber)

    mupdf = _try_pymupdf(data, password)
    if mupdf is not None:
        mupdf.score = _score_text(mupdf.text)
        results.append(mupdf)

    if not results:
        raise PdfUnreadable("Could not extract any text from this PDF.")

    # Higher score wins. On a tie, prefer pdfplumber (legacy default), so
    # we sort by score desc, then by a stable source priority.
    _source_priority = {"pdfplumber": 0, "pymupdf": 1}
    results.sort(key=lambda r: (-r.score, _source_priority.get(r.source, 99)))
    return results[0]
