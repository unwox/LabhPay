"""
Consent & disclaimer recording (compliance).

  GET  /consent/status   -> whether the current user must (re)consent
  POST /consent/accept   -> records explicit consent with audit context

We capture the compliance context server-side (never trusting the client for
it): IP address, user-agent, the session id (JWT jti), the consent version,
and a server timestamp. The version is stamped by the server, not the client,
so a user can only ever consent to the version we're actually serving.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import CONSENT_VERSION
from app.core.dependencies import current_user, get_client_ip
from app.core.security import AccessClaims
from app.db.users import get_user_store
from utils.audit import emit as audit_emit, hash_user_id

router = APIRouter(prefix="/consent", tags=["consent"])


class AcceptBody(BaseModel):
    # Affirmative acknowledgements from the UI. All must be true to proceed.
    terms: bool = False
    privacy: bool = False
    disclaimer: bool = False


@router.get("/status")
def consent_status(
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> dict:
    user = get_user_store().by_id(claims.sub)
    accepted = user.consent_version if user else None
    return {
        "required": accepted != CONSENT_VERSION,
        "current_version": CONSENT_VERSION,
        "accepted_version": accepted,
        "accepted_at": user.consent_at if user else None,
    }


@router.post("/accept", status_code=status.HTTP_200_OK)
def consent_accept(
    body: AcceptBody,
    request: Request,
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> dict:
    if not (body.terms and body.privacy and body.disclaimer):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All acknowledgements are required to proceed.",
        )

    store = get_user_store()
    user = store.by_id(claims.sub)
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    store.record_consent(
        user_id=user.id,
        version=CONSENT_VERSION,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        session_jti=claims.jti,
        terms=body.terms,
        privacy=body.privacy,
        disclaimer=body.disclaimer,
    )
    # Anonymized audit event (no raw IP/UA here — those live in the
    # compliance table; the audit log stays PII-free).
    audit_emit("consent.accept", user=hash_user_id(user.id), version=CONSENT_VERSION)
    return {"ok": True, "version": CONSENT_VERSION}
