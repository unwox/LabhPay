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
from functools import lru_cache
from typing import Any

from utils.logging import get_logger

_log = get_logger("labhpay.audit")

_PII_KEYS = ("event", "phone", "email", "name", "merchant", "merchant_raw", "card", "pan")


def _key() -> bytes:
    raw = os.getenv("SESSION_MASTER_KEY", "") or os.getenv("JWT_SECRET", "")
    return raw.encode("utf-8") if raw else b"labhpay-default-audit-key"


def hash_user_id(user_id: str | None) -> str:
    if not user_id:
        return "anon"
    h = hmac.new(_key(), user_id.encode("utf-8"), hashlib.sha256).hexdigest()
    return h[:16]


@lru_cache(maxsize=1)
def _supabase_client():
    """Lazy, cached Supabase client for the analytics sink. Returns None if
    Supabase isn't configured (dev / workers without creds) or the lib is
    missing — the audit log then stays stdout-only. We read env directly to
    avoid importing backend.app here (utils is a lower layer)."""
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    if not url or not key:
        return None
    try:
        from supabase import create_client  # type: ignore
        return create_client(url, key)
    except Exception:
        return None


def analytics_client():
    """Public accessor for the admin analytics layer to read audit rows.
    Returns a Supabase client or None when analytics isn't configured."""
    return _supabase_client()


def _persist(event: str, payload: dict[str, Any]) -> None:
    """Best-effort write to public.audit_anonymous. Never raises."""
    sb = _supabase_client()
    if sb is None:
        return
    # Pull the privacy-safe dimensions out of the payload; everything else
    # (minus PII) lands in meta as JSON.
    user_hash = payload.get("user")
    bank_id = payload.get("bank_id")
    meta = {k: v for k, v in payload.items() if k not in ("user", "bank_id", "ts")}
    row = {
        "event": event,
        "user_hash": str(user_hash) if user_hash else None,
        "bank_id": str(bank_id) if bank_id else None,
        "meta": meta or None,
    }
    try:
        sb.table("audit_anonymous").insert(row).execute()
    except Exception:
        # Analytics is non-critical; a stale Supabase connection or schema
        # drift must never break the user-facing request.
        pass


def emit(event: str, **fields: Any) -> None:
    """Log an anonymized audit event. Caller pre-anonymizes high-cardinality
    identifiers via hash_user_id()."""
    # NOTE: structlog's bound logger reserves `event` as the positional
    # log-message arg. We pass the event name positionally and keep only
    # extra fields in kwargs to avoid "multiple values for argument 'event'".
    payload = {"ts": int(time.time()), **fields}
    # Drop any obvious PII keys that slipped in (and defensive-strip `event`
    # in case a caller passed it explicitly).
    for forbidden in _PII_KEYS:
        payload.pop(forbidden, None)
    _log.info(event, **payload)
    # Persist for the admin analytics dashboard (best-effort, never raises).
    _persist(event, payload)
