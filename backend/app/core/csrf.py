"""
Stage 10 — CSRF protection via the double-submit-cookie pattern.

How it works:
  - On /auth/verify-otp (and /auth/refresh), we set a non-HttpOnly cookie
    `lp_csrf` containing a random token. The cookie is intentionally JS-
    readable; the same token also has to be echoed in the X-CSRF-Token
    header on state-changing requests.
  - This middleware enforces that pairing for POST / PUT / PATCH / DELETE
    when the request carries an authenticated cookie (`lp_at`).
  - Bearer-style API clients (no `lp_at` cookie at all) are exempt — they
    are not subject to cross-site cookie attacks.
  - Read-only verbs are never gated.

We allow-list a few paths that MUST be reachable without a CSRF cookie:
  - /auth/request-otp        (user has no cookie yet)
  - /auth/verify-otp         (the route that sets the cookie)
  - /auth/logout             (best-effort even if cookie is stale)

The cookie+header pair is compared in constant time.
"""

from __future__ import annotations

import hmac
import secrets

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

CSRF_COOKIE = "lp_csrf"
CSRF_HEADER = "x-csrf-token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
EXEMPT_PATHS = {
    "/auth/request-otp",
    "/auth/verify-otp",
    "/auth/logout",
}


def new_csrf_token() -> str:
    return secrets.token_urlsafe(24)


def csrf_cookie_kwargs(*, secure: bool, samesite: str) -> dict:
    return {
        "key": CSRF_COOKIE,
        "max_age": 24 * 3600,
        "httponly": False,    # MUST be readable by JS to echo into the header
        "secure": secure,
        "samesite": samesite,
        "path": "/",
    }


def set_csrf_cookie(response: Response, *, secure: bool, samesite: str) -> str:
    token = new_csrf_token()
    response.set_cookie(value=token, **csrf_cookie_kwargs(secure=secure, samesite=samesite))
    return token


class CsrfMiddleware(BaseHTTPMiddleware):
    """Reject mismatched/missing CSRF tokens on cookie-auth mutations."""

    async def dispatch(self, request: Request, call_next):
        method = request.method.upper()
        path = request.url.path
        if method in SAFE_METHODS or path in EXEMPT_PATHS:
            return await call_next(request)

        # Only enforce when this looks like a cookie-auth call.
        if "lp_at" not in request.cookies:
            return await call_next(request)

        sent = request.headers.get(CSRF_HEADER, "")
        expected = request.cookies.get(CSRF_COOKIE, "")
        if not sent or not expected or not hmac.compare_digest(sent, expected):
            return JSONResponse(
                {"detail": "CSRF token missing or invalid."},
                status_code=403,
            )
        return await call_next(request)
