"""
Encrypted session blob store + job status store, both Redis-backed.

Keys:
  sess:{uid}:pdf:{jid}        raw bytes: nonce(12) || ciphertext
  sess:{uid}:filename:{jid}   original filename (small string)
  sess:{uid}:status:{jid}     JSON JobStatus
  sess:{uid}:result:{jid}     JSON JobResult
  sess:{uid}:password_hint    set by API when user submits password to retry

All keys carry a TTL (default 30 min) and are deleted on logout.
"""

from __future__ import annotations

import json
import os
from typing import Optional

import redis

from app.core.config import get_settings
from shared.schemas import JobResult, JobStage, JobStatus
from utils.crypto import open_ as aes_open
from utils.crypto import seal as aes_seal
from utils.crypto import Sealed
from utils.session_keys import derive_session_key

_TTL = int(os.getenv("REDIS_TTL_DEFAULT_SECONDS", "1800"))


def _bytes_client() -> redis.Redis:
    """Bytes-mode client for encrypted blobs (decode_responses=False)."""
    s = get_settings()
    return redis.from_url(s.REDIS_URL, decode_responses=False, socket_timeout=2.0)


def _str_client() -> redis.Redis:
    s = get_settings()
    return redis.from_url(s.REDIS_URL, decode_responses=True, socket_timeout=2.0)


# ---------------- PDF blob ----------------

def store_pdf(*, user_id: str, job_id: str, filename: str, data: bytes) -> None:
    key = derive_session_key(user_id)
    sealed = aes_seal(key, data, aad=job_id.encode())
    blob = sealed.to_bytes()
    r = _bytes_client()
    pipe = r.pipeline()
    pipe.setex(f"sess:{user_id}:pdf:{job_id}", _TTL, blob)
    pipe.setex(f"sess:{user_id}:filename:{job_id}", _TTL, filename.encode())
    pipe.execute()


def fetch_pdf(*, user_id: str, job_id: str) -> Optional[bytes]:
    r = _bytes_client()
    blob = r.get(f"sess:{user_id}:pdf:{job_id}")
    if not blob:
        return None
    key = derive_session_key(user_id)
    sealed = Sealed.from_bytes(blob)
    return aes_open(key, sealed, aad=job_id.encode())


def fetch_filename(*, user_id: str, job_id: str) -> Optional[str]:
    r = _bytes_client()
    raw = r.get(f"sess:{user_id}:filename:{job_id}")
    return raw.decode() if raw else None


def delete_pdf(*, user_id: str, job_id: str) -> None:
    r = _str_client()
    r.delete(f"sess:{user_id}:pdf:{job_id}", f"sess:{user_id}:filename:{job_id}")


# ---------------- Password (for password-protected PDFs) ----------------

def store_password(*, user_id: str, job_id: str, password: str) -> None:
    """
    The password is short-lived (5 minutes) and stored encrypted with the
    session key — same envelope as the PDF. Deleted as soon as the worker
    consumes it.
    """
    key = derive_session_key(user_id)
    sealed = aes_seal(key, password.encode("utf-8"), aad=f"pw:{job_id}".encode())
    _bytes_client().setex(f"sess:{user_id}:pw:{job_id}", 300, sealed.to_bytes())


def consume_password(*, user_id: str, job_id: str) -> Optional[str]:
    r = _bytes_client()
    k = f"sess:{user_id}:pw:{job_id}"
    blob = r.get(k)
    if not blob:
        return None
    r.delete(k)
    key = derive_session_key(user_id)
    sealed = Sealed.from_bytes(blob)
    return aes_open(key, sealed, aad=f"pw:{job_id}".encode()).decode("utf-8")


# ---------------- Status + result ----------------

def set_status(status: JobStatus, *, user_id: str) -> None:
    _str_client().setex(
        f"sess:{user_id}:status:{status.job_id}",
        _TTL,
        status.model_dump_json(),
    )


def get_status(*, user_id: str, job_id: str) -> Optional[JobStatus]:
    raw = _str_client().get(f"sess:{user_id}:status:{job_id}")
    return JobStatus.model_validate_json(raw) if raw else None


def set_result(result: JobResult, *, user_id: str) -> None:
    _str_client().setex(
        f"sess:{user_id}:result:{result.job_id}",
        _TTL,
        result.model_dump_json(),
    )


def get_result(*, user_id: str, job_id: str) -> Optional[JobResult]:
    raw = _str_client().get(f"sess:{user_id}:result:{job_id}")
    return JobResult.model_validate_json(raw) if raw else None


# ---------------- Session purge (used by /auth/logout and cleanup worker) ----------------

def purge_user_session(user_id: str) -> int:
    """Delete every Redis key under sess:{user_id}:*. Returns count deleted."""
    r = _str_client()
    deleted = 0
    for k in r.scan_iter(match=f"sess:{user_id}:*", count=200):
        r.delete(k)
        deleted += 1
    return deleted
