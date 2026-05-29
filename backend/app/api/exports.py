"""
Stage 9 — Export Center.

  GET /exports/{kind}.pdf?ids=...

  kind ∈ {summary, yearly, categories, subscriptions, tax-summary}

Each request:
  1. Loads the user's statements from Redis (session-scoped).
  2. Builds the requested PDF in-memory via app.services.exports.
  3. Streams the bytes with a Content-Disposition that picks a sensible
     filename. We never write the PDF to disk.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response

from app.core.dependencies import current_user
from app.core.security import AccessClaims
from app.services.exports import REPORTS
from app.services.storage import _str_client, get_result
from utils.audit import emit as audit_emit, hash_user_id

router = APIRouter(prefix="/exports", tags=["exports"])

_KIND_FILES = {
    "summary": "summary-report",
    "yearly": "yearly-report",
    "categories": "category-report",
    "subscriptions": "subscriptions-report",
    "tax-summary": "tax-summary",
}


def _list_job_ids(user_id: str) -> list[str]:
    """Find every result key for this user. KEYS first, SCAN fallback."""
    prefix = f"sess:{user_id}:result:"
    try:
        keys = _str_client().keys(f"{prefix}*") or []
    except Exception:
        keys = []
    out = [k[len(prefix):] for k in keys if isinstance(k, str) and k.startswith(prefix)]
    if not out:
        try:
            for k in _str_client().scan_iter(match=f"{prefix}*", count=200):
                if isinstance(k, str) and k.startswith(prefix):
                    out.append(k[len(prefix):])
        except Exception:
            pass
    return list(dict.fromkeys(out))


@router.get("/{kind}.pdf")
def export_pdf(
    kind: str,
    claims: Annotated[AccessClaims, Depends(current_user)],
    ids: str | None = Query(None, description="Comma-separated job ids; omit for all"),
) -> Response:
    builder = REPORTS.get(kind)
    if not builder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown export '{kind}'. Known: {sorted(REPORTS)}",
        )
    job_ids = (
        [i.strip() for i in ids.split(",") if i.strip()]
        if ids
        else _list_job_ids(claims.sub)
    )
    statements = []
    for jid in job_ids:
        r = get_result(user_id=claims.sub, job_id=jid)
        if r:
            statements.append(r.statement)

    pdf_bytes = builder(statements)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    fname = f"labhpay-{_KIND_FILES[kind]}-{stamp}.pdf"
    audit_emit(
        "exports.download",
        user=hash_user_id(claims.sub),
        kind=kind,
        bytes=len(pdf_bytes),
        statements=len(statements),
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{fname}"',
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/")
def list_exports(
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> dict:
    """Static catalog so the frontend can render consistent labels."""
    return {
        "exports": [
            {"kind": "summary",       "title": "Summary report",
             "blurb": "Top-of-mind view of every loaded statement, totals, and charges."},
            {"kind": "yearly",        "title": "Yearly report",
             "blurb": "Month-by-month spend, with a delta against the prior month."},
            {"kind": "categories",    "title": "Category report",
             "blurb": "Spending grouped by category with the top merchants per group."},
            {"kind": "subscriptions", "title": "Subscriptions report",
             "blurb": "Recurring charges with monthly and annualised totals."},
            {"kind": "tax-summary",   "title": "Tax-friendly summary",
             "blurb": "Insurance, investments, healthcare, utilities — grouped for filing prep."},
        ]
    }
