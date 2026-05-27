"""
Stage 10.1 — Google Identity Services ID token verification.

The browser obtains an `id_token` (a JWT signed by Google) via the
"Sign in with Google" button. We verify that token here:

  1. Signature against Google's published public keys.
  2. `aud` claim equals our configured GOOGLE_CLIENT_ID.
  3. `iss` is accounts.google.com (or https://accounts.google.com).
  4. Token is not expired (google-auth handles `exp`).

If verification succeeds we extract a minimal identity payload and hand
it to the auth route, which upserts the user and issues our own JWT
cookies. The Google `sub` is the stable, opaque user id we store as
google_id.

Network: this performs a one-off fetch of Google's certs (cached by
google.auth.transport.requests for the process lifetime).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.config import get_settings


class GoogleAuthError(Exception):
    pass


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str           # stable Google account id
    email: str
    email_verified: bool
    name: str | None
    picture: str | None


def verify_id_token(id_token_jwt: str) -> GoogleIdentity:
    """Verify a Google ID token and return the identity. Raises
    GoogleAuthError on any failure."""
    s = get_settings()
    client_id = (s.GOOGLE_CLIENT_ID or "").strip()
    if not client_id:
        raise GoogleAuthError(
            "Google sign-in isn't enabled (GOOGLE_CLIENT_ID is unset)."
        )

    # Lazy imports so the module is importable even if google-auth isn't
    # installed in dev environments.
    try:
        from google.oauth2 import id_token  # type: ignore
        from google.auth.transport import requests as google_requests  # type: ignore
    except Exception as e:  # pragma: no cover
        raise GoogleAuthError(f"google-auth not available: {e}") from e

    try:
        info = id_token.verify_oauth2_token(
            id_token_jwt,
            google_requests.Request(),
            client_id,
        )
    except ValueError as e:
        raise GoogleAuthError(f"Invalid ID token: {e}") from e

    iss = info.get("iss", "")
    if iss not in ("accounts.google.com", "https://accounts.google.com"):
        raise GoogleAuthError(f"Unexpected issuer: {iss!r}")

    sub = info.get("sub")
    email = (info.get("email") or "").strip()
    if not sub or not email:
        raise GoogleAuthError("ID token is missing sub or email claim.")

    return GoogleIdentity(
        sub=str(sub),
        email=email,
        email_verified=bool(info.get("email_verified", False)),
        name=info.get("name"),
        picture=info.get("picture"),
    )
