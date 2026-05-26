"""
PDF text extraction helpers. Used by the worker pipeline.

Strategy:
  1. Try pdfplumber (best for tabular layouts).
  2. Fall back to PyMuPDF (faster, sometimes better text).
  3. Last resort: OCR (Stage 4 ships the hook; OCR install is optional).

We return (text, pages, ocr_used). Raises `PdfPasswordRequired` on
encrypted PDFs so the caller can prompt the user.
"""

from __future__ import annotations

import io
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
    Run the extractor cascade. Raises PdfPasswordRequired when locked
    and no password was supplied (or supplied password was wrong).
    """
    # PyMuPDF first only to detect encryption fast; pdfplumber is generally
    # better for tabular layouts so we try it after the password gate.
    if is_password_protected(data) and not password:
        raise PdfPasswordRequired()

    r = _try_pdfplumber(data, password)
    if r is not None:
        return r

    r = _try_pymupdf(data, password)
    if r is not None:
        return r

    raise PdfUnreadable("Could not extract any text from this PDF.")
