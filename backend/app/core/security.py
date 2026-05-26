"""
JWT + token helpers.

- Access tokens: short-lived JWT (HS256), 24h default.
- Refresh tokens: opaque random strings (NOT JWTs), stored hashed in Supabase.
  Rotated on every refresh. Revoke = delete the row.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time
import uuid
from dataclasses import dataclass
from typing import Any

import jwt

from app.core.config import get_settings


@dataclass(frozen=True)
class AccessClaims:
    sub: str          # user id
    phone: str        # masked? no — backend internal; frontend never reads token payload directly
    iat: int
    exp: int
    jti: str


def issue_access_token(*, user_id: str, phone_e164: str) -> tuple[str, AccessClaims]:
    s = get_settings()
    now = int(time.time())
    claims = AccessClaims(
        sub=user_id,
        phone=phone_e164,
        iat=now,
        exp=now + s.JWT_ACCESS_TTL_SECONDS,
        jti=uuid.uuid4().hex,
    )
    token = jwt.encode(
        {
            "sub": claims.sub,
            "phone": claims.phone,
            "iat": claims.iat,
            "exp": claims.exp,
            "jti": claims.jti,
            "iss": "labhpay",
        },
        s.JWT_SECRET,
        algorithm=s.JWT_ALG,
    )
    return token, claims


def decode_access_token(token: str) -> AccessClaims:
    s = get_settings()
    payload: dict[str, Any] = jwt.decode(
        token,
        s.JWT_SECRET,
        algorithms=[s.JWT_ALG],
        options={"require": ["exp", "iat", "sub"]},
        issuer="labhpay",
    )
    return AccessClaims(
        sub=payload["sub"],
        phone=payload.get("phone", ""),
        iat=int(payload["iat"]),
        exp=int(payload["exp"]),
        jti=payload.get("jti", ""),
    )


# ---- Refresh tokens (opaque) ----

def new_refresh_token() -> str:
    """A URL-safe random token. 32 bytes ≈ 43 chars."""
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    s = get_settings()
    return hmac.new(s.JWT_SECRET.encode(), token.encode(), hashlib.sha256).hexdigest()


# ---- Cookie helpers (Stage 3 default flags) ----

def access_cookie_kwargs() -> dict[str, Any]:
    s = get_settings()
    is_prod = s.APP_ENV == "production"
    return {
        "key": "lp_at",
        "max_age": s.JWT_ACCESS_TTL_SECONDS,
        "httponly": True,
        "secure": is_prod,
        "samesite": "lax" if not is_prod else "none",
        "path": "/",
    }


def refresh_cookie_kwargs() -> dict[str, Any]:
    s = get_settings()
    is_prod = s.APP_ENV == "production"
    return {
        "key": "lp_rt",
        "max_age": s.JWT_REFRESH_TTL_SECONDS,
        "httponly": True,
        "secure": is_prod,
        "samesite": "lax" if not is_prod else "none",
        "path": "/auth",
    }
