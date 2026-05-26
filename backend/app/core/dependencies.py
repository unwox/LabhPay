"""
FastAPI dependencies for auth + request context.
"""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Cookie, Depends, HTTPException, Request, status

from app.core.security import AccessClaims, decode_access_token


def get_client_ip(request: Request) -> str:
    # Honor X-Forwarded-For when behind HF Spaces proxy.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"


async def current_user(
    lp_at: Annotated[str | None, Cookie()] = None,
) -> AccessClaims:
    if not lp_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        claims = decode_access_token(lp_at)
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        ) from e
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from e
    # Stage 10: keep an idle-session watchdog warm. The cleanup worker
    # reads this key to decide when a session has gone quiet long enough
    # to purge.
    try:
        from app.services.activity import bump_last_seen
        bump_last_seen(claims.sub)
    except Exception:
        pass
    return claims
