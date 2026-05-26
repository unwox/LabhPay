"""
Stage 9 — Resolution Assistant endpoints.

  GET  /resolution/actions/{job_id}/{txn_id}
       Lists actions available for this transaction + recipient hints
       (we resolve the most likely bank/merchant once so the UI can
       preview the recipient before the user picks an action).

  POST /resolution/email
       Body: { job_id, txn_id, action_id, language }
       Returns a deterministic draft email (subject + body + recipient).

We never store the draft. The frontend handles Copy / mailto / PDF — those
are presentation concerns; the API just produces text.
"""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.dependencies import current_user
from app.core.security import AccessClaims
from app.services.resolution import (
    ACTIONS,
    Action,
    applicable_actions,
    draft_email,
    get_action,
    resolve_recipient,
)
from app.services.storage import get_result
from shared.schemas import Statement, Transaction
from utils.audit import emit as audit_emit, hash_user_id

router = APIRouter(prefix="/resolution", tags=["resolution"])


# ---------- helpers ----------

def _load_txn(user_id: str, job_id: str, txn_id: str) -> tuple[Statement, Transaction]:
    r = get_result(user_id=user_id, job_id=job_id)
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found."
        )
    for t in r.statement.transactions:
        if t.id == txn_id:
            return r.statement, t
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found."
    )


def _has_duplicate(stmt: Statement, txn: Transaction) -> bool:
    same = [
        t for t in stmt.transactions
        if t.id != txn.id
        and t.txn_date == txn.txn_date
        and (t.merchant_norm or t.merchant_raw) == (txn.merchant_norm or txn.merchant_raw)
        and abs(float(t.amount) - float(txn.amount)) < 0.005
    ]
    return bool(same)


def _action_payload(a: Action) -> dict:
    return {
        "id": a.id,
        "label_en": a.label_en,
        "label_hi": a.label_hi,
        "blurb_en": a.blurb_en,
        "blurb_hi": a.blurb_hi,
        "recipient": a.recipient,
    }


# ---------- GET /resolution/actions ----------

@router.get("/actions/{job_id}/{txn_id}")
def list_actions(
    job_id: str,
    txn_id: str,
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> dict:
    stmt, txn = _load_txn(claims.sub, job_id, txn_id)
    has_dup = _has_duplicate(stmt, txn)
    actions = applicable_actions(txn, has_duplicate=has_dup)
    # Resolve each action's recipient once so the UI can show "→ HDFC support"
    # without firing another request per action.
    recipients = []
    for a in actions:
        r = resolve_recipient(action=a, txn=txn, statement=stmt)
        recipients.append({
            "action_id": a.id,
            "name": r.name,
            "kind": r.kind,
            "email": r.email,
            "secondary_email": r.secondary_email,
            "expected_sla": r.expected_sla,
        })
    return {
        "txn": {
            "id": txn.id,
            "merchant": txn.merchant_norm or txn.merchant_raw,
            "amount": float(txn.amount),
            "date": txn.txn_date.isoformat(),
            "is_debit": txn.is_debit,
            "is_emi": txn.is_emi,
            "category": txn.category.value,
            "has_duplicate": has_dup,
        },
        "actions": [_action_payload(a) for a in actions],
        "recipients": recipients,
    }


# ---------- POST /resolution/email ----------

class EmailRequest(BaseModel):
    job_id: str = Field(..., min_length=1)
    txn_id: str = Field(..., min_length=1)
    action_id: str = Field(..., min_length=1)
    language: Literal["en", "hi"] = "en"


class EmailResponse(BaseModel):
    subject: str
    body: str
    recipient_name: str
    recipient_kind: str
    recipient_email: str | None
    secondary_email: str | None
    expected_sla: str | None
    action_id: str
    language: Literal["en", "hi"]
    notes: list[str]


@router.post("/email", response_model=EmailResponse)
def make_email(
    req: EmailRequest,
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> EmailResponse:
    stmt, txn = _load_txn(claims.sub, req.job_id, req.txn_id)
    a = get_action(req.action_id)
    if not a:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown action '{req.action_id}'.",
        )
    draft = draft_email(action=a, txn=txn, statement=stmt, language=req.language)
    audit_emit(
        "resolution.email",
        user=hash_user_id(claims.sub),
        action=a.id,
        recipient=draft.recipient.kind,
        language=draft.language,
    )
    return EmailResponse(
        subject=draft.subject,
        body=draft.body,
        recipient_name=draft.recipient.name,
        recipient_kind=draft.recipient.kind,
        recipient_email=draft.recipient.email,
        secondary_email=draft.recipient.secondary_email,
        expected_sla=draft.recipient.expected_sla,
        action_id=draft.action_id,
        language=draft.language,
        notes=draft.notes,
    )


@router.get("/actions")
def list_all_actions() -> dict:
    """Static catalog of every action — useful for the frontend to render
    consistent labels without a transaction in hand."""
    return {"actions": [_action_payload(a) for a in ACTIONS]}
