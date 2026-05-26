"""
Stage 10 — Anonymized audit trail.

Single sink: stdout via structlog. The structured logger already scrubs
PII (utils.logging), so we just have to make sure:

  - We never emit raw user_id.  Hash it with HMAC(SESSION_MASTER_KEY).
  - We never emit raw phone or email — masked variants only.
  - We never emit transaction merchant strings or amounts.
  - We include enough metadata to reconstruct *what kind* of thing
    happened (action, recipient_kind, statement_count, etc.) without
    being able to link rows to a person.

Each event has a stable name (snake_case). Add new ones sparingly — every
event is a data-handling commitment.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import time
from typing import Any

from utils.logging import get_logger

_log = get_logger("labhpay.audit")


def _key() -> bytes:
    raw = os.getenv("SESSION_MASTER_KEY", "") or os.getenv("JWT_SECRET", "")
    return raw.encode("utf-8") if raw else b"labhpay-default-audit-key"


def hash_user_id(user_id: str | None) -> str:
    if not user_id:
        return "anon"
    h = hmac.new(_key(), user_id.encode("utf-8"), hashlib.sha256).hexdigest()
    return h[:16]


def emit(event: str, **fields: Any) -> None:
    """Log an anonymized audit event. Caller pre-anonymizes high-cardinality
    identifiers via hash_user_id()."""
    payload = {"event": event, "ts": int(time.time()), **fields}
    # Drop any obvious PII keys that slipped in.
    for forbidden in ("phone", "email", "name", "merchant", "merchant_raw", "card", "pan"):
        payload.pop(forbidden, None)
    _log.info("audit", **payload)
