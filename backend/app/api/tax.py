"""
Tax Toolkit — Form 16 auto-fill.

  POST /tax/form16/extract   (auth)  multipart: file (PDF), password (optional)

We extract the text of the user's Form 16 with PyMuPDF (handling a password if
the PDF is encrypted), ask the AI gateway to pull out the key tax figures as
JSON, and return those numbers so the frontend can pre-fill the Tax Toolkit.
The user always reviews/edits before anything is computed.

Privacy: the PDF is processed in memory and never stored. We send only the
extracted text (no PAN/name requested back) to the AI provider, consistent with
the consent notice. Nothing is written to the database.
"""

from __future__ import annotations

import json
import re
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.dependencies import current_user
from app.core.security import AccessClaims
from utils.audit import emit as audit_emit, hash_user_id

router = APIRouter(prefix="/tax", tags=["tax"])

MAX_BYTES = 10 * 1024 * 1024  # 10 MB
_FIELDS = (
    "gross_salary",
    "hra_exempt",
    "lta_exempt",
    "standard_deduction",
    "ded_80c",
    "ded_80d",
    "nps_80ccd1b",
    "nps_employer_80ccd2",
    "home_loan_interest",
    "other_deductions",
    "other_income",
    "capital_gains",
    "tds",
)


def _extract_text(data: bytes, password: str | None) -> str:
    try:
        import fitz  # PyMuPDF
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"PDF engine unavailable: {e}") from e

    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception:
        raise HTTPException(status_code=400, detail="That doesn't look like a valid PDF.")

    if doc.needs_pass:
        if not password or not doc.authenticate(password):
            raise HTTPException(
                status_code=422,
                detail="This Form 16 is password-protected. Enter the password (often PAN + date of birth) and try again.",
            )

    # Form 16 Part B (the part we need) is short; cap pages and length.
    parts = []
    for page in doc[: min(6, doc.page_count)]:
        parts.append(page.get_text("text"))
    doc.close()
    text = "\n".join(parts)
    return text[:18000]


def _coerce_int(v) -> int:
    try:
        if isinstance(v, str):
            v = re.sub(r"[^\d.-]", "", v)
        return max(0, int(round(float(v))))
    except Exception:
        return 0


def _parse_json(text: str) -> dict:
    t = (text or "").strip()
    if t.startswith("```"):
        t = t.strip("`")
        if "\n" in t:
            t = t.split("\n", 1)[1]
    # Grab the first {...} block defensively.
    m = re.search(r"\{.*\}", t, re.DOTALL)
    if m:
        t = m.group(0)
    try:
        return json.loads(t)
    except Exception:
        return {}


@router.post("/form16/extract")
async def extract_form16(
    claims: Annotated[AccessClaims, Depends(current_user)],
    file: UploadFile = File(...),
    password: str | None = Form(None),
) -> dict:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB).")

    text = _extract_text(data, password)
    if len(text.strip()) < 50:
        raise HTTPException(
            status_code=422,
            detail="Couldn't read text from this PDF (it may be a scanned image). Please enter the values manually.",
        )

    try:
        from ai_gateway import get_gateway
        from ai_gateway.prompts import get_prompt

        prompt = get_prompt("form16_extract")
        messages = prompt.render(form16_text=text)
        result = get_gateway().chat(messages, tier=prompt.tier, user_id=claims.sub)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Auto-fill is temporarily unavailable: {e}. You can enter the values manually.",
        )

    parsed = _parse_json(result.text or "")
    fields = {k: _coerce_int(parsed.get(k)) for k in _FIELDS}

    audit_emit("tax.form16_extract", user=hash_user_id(claims.sub))
    return {"ok": True, "fields": fields}
