"""
Auth routes — WhatsApp OTP via NotifyNow + JWT cookie session.

Endpoints:
  POST /auth/request-otp   {phone} -> {ok: true}
  POST /auth/verify-otp    {phone, otp} -> sets cookies, returns user
  POST /auth/refresh       (uses lp_rt cookie) -> rotates access + refresh
  POST /auth/logout        clears cookies + revokes refresh
  GET  /auth/me            returns current user (auth required)
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.dependencies import current_user, get_client_ip
from app.core.security import (
    AccessClaims,
    access_cookie_kwargs,
    hash_refresh_token,
    issue_access_token,
    new_refresh_token,
    refresh_cookie_kwargs,
)
from app.db.users import User, get_user_store
from app.services.notifynow import send_login_otp
from app.services.otp import (
    RateLimitError,
    check_request_rate,
    store_new_otp,
    verify_otp,
)
from app.services.phone import InvalidPhoneError, normalize_indian_mobile

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------- Request / response models ----------

class RequestOtpBody(BaseModel):
    phone: str = Field(..., description="Indian mobile, any format (+91, 91, or 10 digits)")
    first_name: str | None = Field(None, max_length=40)


class VerifyOtpBody(BaseModel):
    phone: str
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class UserOut(BaseModel):
    id: str
    phone_e164: str
    display_name: str | None
    language: str
    private_mode_default: bool


def _user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        phone_e164=u.phone_e164,
        display_name=u.display_name,
        language=u.language,
        private_mode_default=u.private_mode_default,
    )


# ---------- Cookie helpers ----------

def _set_session_cookies(response: Response, *, access_token: str, refresh_token: str) -> None:
    response.set_cookie(value=access_token, **access_cookie_kwargs())
    response.set_cookie(value=refresh_token, **refresh_cookie_kwargs())


def _clear_session_cookies(response: Response) -> None:
    a = access_cookie_kwargs()
    r = refresh_cookie_kwargs()
    response.delete_cookie(key=a["key"], path=a["path"])
    response.delete_cookie(key=r["key"], path=r["path"])


def _issue_session(response: Response, user: User) -> tuple[str, str]:
    """Mint access + refresh tokens for `user` and set cookies on response."""
    s = get_settings()
    store = get_user_store()
    access_token, _ = issue_access_token(user_id=user.id, phone_e164=user.phone_e164)
    refresh_token = new_refresh_token()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=s.JWT_REFRESH_TTL_SECONDS)
    store.store_refresh(user.id, hash_refresh_token(refresh_token), expires_at)
    _set_session_cookies(response, access_token=access_token, refresh_token=refresh_token)
    return access_token, refresh_token


# ---------- Routes ----------

@router.post("/request-otp")
def request_otp(body: RequestOtpBody, request: Request) -> dict:
    try:
        phone = normalize_indian_mobile(body.phone)
    except InvalidPhoneError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    try:
        check_request_rate(phone_e164=phone, client_ip=get_client_ip(request))
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e)) from e

    otp = store_new_otp(phone_e164=phone)
    sent = send_login_otp(phone_e164=phone, otp=otp, first_name=body.first_name)
    if not sent:
        # We still consider the request OK (don't leak failure modes) but flag in detail
        # so the frontend can show a quiet retry hint without exposing internals.
        raise HTTPException(
            status_code=502,
            detail="Could not send OTP right now. Please try again in a moment.",
        )
    return {"ok": True, "phone": phone, "expires_in_minutes": get_settings().NOTIFYNOW_OTP_TTL_MINUTES}


@router.post("/verify-otp")
def verify_otp_route(body: VerifyOtpBody, response: Response) -> dict:
    try:
        phone = normalize_indian_mobile(body.phone)
    except InvalidPhoneError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if not verify_otp(phone_e164=phone, otp=body.otp):
        raise HTTPException(status_code=401, detail="Invalid or expired code.")

    store = get_user_store()
    user = store.upsert_by_phone(phone)
    store.touch_login(user.id)
    _issue_session(response, user)
    return {"ok": True, "user": _user_out(user).model_dump()}


@router.post("/refresh")
def refresh(
    response: Response,
    lp_rt: Annotated[str | None, Cookie()] = None,
) -> dict:
    if not lp_rt:
        raise HTTPException(status_code=401, detail="No refresh cookie.")
    store = get_user_store()
    found = store.find_refresh(hash_refresh_token(lp_rt))
    if not found:
        raise HTTPException(status_code=401, detail="Refresh token invalid or expired.")
    token_id, user_id = found
    user = store.by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")
    # Rotate: revoke the old refresh, issue new pair.
    store.revoke_refresh(token_id)
    _issue_session(response, user)
    return {"ok": True}


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    response: Response,
    claims: AccessClaims | None = Depends(lambda lp_at=Cookie(default=None): None),  # noqa: B008
    lp_at: Annotated[str | None, Cookie()] = None,
    lp_rt: Annotated[str | None, Cookie()] = None,
) -> dict:
    # Best-effort: revoke this user's refresh tokens. We don't require valid access
    # token for logout, but if we can decode it we'll purge that user's refresh set.
    if lp_at:
        try:
            from app.core.security import decode_access_token
            c = decode_access_token(lp_at)
            get_user_store().purge_user_refresh(c.sub)
        except Exception:
            pass
    elif lp_rt:
        try:
            store = get_user_store()
            found = store.find_refresh(hash_refresh_token(lp_rt))
            if found:
                store.purge_user_refresh(found[1])
        except Exception:
            pass
    _clear_session_cookies(response)
    return {"ok": True}


@router.get("/me")
def me(claims: Annotated[AccessClaims, Depends(current_user)]) -> dict:
    user = get_user_store().by_id(claims.sub)
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return {"user": _user_out(user).model_dump()}
