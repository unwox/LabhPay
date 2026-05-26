"""
Per-session key derivation.

We hold a single master key (`SESSION_MASTER_KEY`, base64). For every user
session we derive a 32-byte AES-GCM key via HKDF-SHA256 with the user id as
salt. The master key never touches Redis; only derived keys ever encrypt
user data, and they never leave the process either (we re-derive on demand).
"""

from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


def _master_key() -> bytes:
    raw = os.getenv("SESSION_MASTER_KEY", "")
    if not raw:
        # Dev convenience: deterministic but obviously-not-secret key.
        # Production refuses to start without a real key (caller asserts).
        return b"\0" * 32
    try:
        key = base64.b64decode(raw)
    except Exception as e:
        raise RuntimeError("SESSION_MASTER_KEY must be base64-encoded 32 bytes") from e
    if len(key) != 32:
        raise RuntimeError("SESSION_MASTER_KEY must decode to exactly 32 bytes")
    return key


def derive_session_key(user_id: str, *, info: bytes = b"labhpay/session-v1") -> bytes:
    return HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=user_id.encode("utf-8"),
        info=info,
    ).derive(_master_key())
