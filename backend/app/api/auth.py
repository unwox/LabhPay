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
from app.core.csrf import CSRF_COOKIE, set_csrf_cookie
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
from app.services.storage import purge_user_session
from utils.audit import emit as audit_emit, hash_user_id

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
    phone_e164: str | None = None
    email: str | None = None
    display_name: str | None = None
    language: str
    private_mode_default: bool
    is_admin: bool = False
    consent_required: bool = False


def _user_out(u: User) -> UserOut:
    from app.core.config import CONSENT_VERSION
    return UserOut(
        id=u.id,
        phone_e164=u.phone_e164,
        email=u.email,
        display_name=u.display_name,
        language=u.language,
        private_mode_default=u.private_mode_default,
        is_admin=get_settings().is_admin_email(u.email),
        consent_required=(u.consent_version != CONSENT_VERSION),
    )


class GoogleVerifyBody(BaseModel):
    credential: str = Field(..., min_length=20, description="Google ID token JWT")


# ---------- Cookie helpers ----------

def _set_session_cookies(response: Response, *, access_token: str, refresh_token: str) -> None:
    response.set_cookie(value=access_token, **access_cookie_kwargs())
    response.set_cookie(value=refresh_token, **refresh_cookie_kwargs())
    a = access_cookie_kwargs()
    set_csrf_cookie(response, secure=a["secure"], samesite=a["samesite"])


def _clear_session_cookies(response: Response) -> None:
    a = access_cookie_kwargs()
    r = refresh_cookie_kwargs()
    response.delete_cookie(key=a["key"], path=a["path"])
    response.delete_cookie(key=r["key"], path=r["path"])
    response.delete_cookie(key=CSRF_COOKIE, path="/")


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
    except Exception:
        # OTP store/rate-limit lives in Redis; if it's down, point the user at
        # Google sign-in (which doesn't need Redis) rather than failing hard.
        raise HTTPException(
            status_code=503,
            detail="OTP login is temporarily unavailable. Please sign in with Google instead.",
        )

    try:
        otp = store_new_otp(phone_e164=phone)
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="OTP login is temporarily unavailable. Please sign in with Google instead.",
        )
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

    try:
        ok = verify_otp(phone_e164=phone, otp=body.otp)
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="OTP login is temporarily unavailable. Please sign in with Google instead.",
        )
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid or expired code.")

    store = get_user_store()
    user = store.upsert_by_phone(phone)
    if user.disabled:
        raise HTTPException(status_code=403, detail="This account has been disabled.")
    store.touch_login(user.id)
    _issue_session(response, user)
    audit_emit("auth.login", user=hash_user_id(user.id))
    return {"ok": True, "user": _user_out(user).model_dump()}


@router.post("/google")
def google_sign_in(body: GoogleVerifyBody, response: Response) -> dict:
    """Verify a Google ID token and issue our session cookies.

    The frontend gets the `credential` from Google Identity Services
    (button or One Tap), POSTs it here, and we treat the verified email
    as the identity for upsert/login.
    """
    from app.services.google_auth import GoogleAuthError, verify_id_token

    try:
        identity = verify_id_token(body.credential)
    except GoogleAuthError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e

    if not identity.email_verified:
        # Google's policy is to set email_verified=true for real Google
        # accounts; refusing unverified emails is cheap defense.
        raise HTTPException(
            status_code=403,
            detail="Your Google email isn't verified. Verify it and try again.",
        )

    store = get_user_store()
    user = store.upsert_by_google(
        google_id=identity.sub,
        email=identity.email,
        display_name=identity.name,
    )
    if user.disabled:
        raise HTTPException(status_code=403, detail="This account has been disabled.")
    store.touch_login(user.id)
    _issue_session(response, user)
    audit_emit("auth.login.google", user=hash_user_id(user.id))
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
    # Best-effort: revoke this user's refresh tokens *and* purge every Redis
    # key under sess:{uid}:* so no statement bytes, derived results, or
    # rate-limit counters survive the sign-out. This is the explicit Stage 10
    # verify gate: "Logout → all session keys gone from Redis."
    purged_user_id: str | None = None
    if lp_at:
        try:
            from app.core.security import decode_access_token
            c = decode_access_token(lp_at)
            purged_user_id = c.sub
        except Exception:
            pass
    if purged_user_id is None and lp_rt:
        try:
            store = get_user_store()
            found = store.find_refresh(hash_refresh_token(lp_rt))
            if found:
                purged_user_id = found[1]
        except Exception:
            pass
    if purged_user_id:
        try:
            get_user_store().purge_user_refresh(purged_user_id)
        except Exception:
            pass
        try:
            purge_user_session(purged_user_id)
        except Exception:
            pass
        try:
            audit_emit("auth.logout", user=hash_user_id(purged_user_id))
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
