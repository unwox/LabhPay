"""
OTP store + rate limiter — all backed by Redis.

Schema:
  otp:<phone>            JSON {hash, attempts}   TTL = OTP_TTL_MINUTES
  rl:otp:phone:<phone>   INCR counter           TTL = 1h
  rl:otp:ip:<ip>         INCR counter           TTL = 1h
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass

from app.core.config import get_settings
from app.core.redis_client import get_redis

OTP_LEN = 6
MAX_OTP_ATTEMPTS = 3


@dataclass
class RateLimitError(Exception):
    detail: str

    def __str__(self) -> str:  # pragma: no cover
        return self.detail


# ---- Helpers ----

def _hash_otp(otp: str, phone_e164: str) -> str:
    s = get_settings()
    # Salt with phone + server secret so the same OTP for two phones differs.
    return hmac.new(
        s.JWT_SECRET.encode(),
        f"{phone_e164}:{otp}".encode(),
        hashlib.sha256,
    ).hexdigest()


def _generate_otp() -> str:
    # secrets.randbelow gives uniform distribution over 10**6.
    return f"{secrets.randbelow(10**OTP_LEN):0{OTP_LEN}d}"


# ---- Rate limiting ----

def _bump_and_check(key: str, limit: int, window_s: int = 3600) -> bool:
    r = get_redis()
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window_s)
    count, _ = pipe.execute()
    return int(count) <= limit


def check_request_rate(*, phone_e164: str, client_ip: str) -> None:
    s = get_settings()
    limit = s.NOTIFYNOW_RATE_LIMIT_PER_HOUR
    if not _bump_and_check(f"rl:otp:phone:{phone_e164}", limit):
        raise RateLimitError(f"Too many OTP requests for this phone. Try again in an hour.")
    if not _bump_and_check(f"rl:otp:ip:{client_ip}", limit * 4):
        raise RateLimitError("Too many OTP requests from this network. Try again later.")


# ---- OTP lifecycle ----

def store_new_otp(*, phone_e164: str) -> str:
    """Generate, store (hashed), return the plaintext OTP for the channel send."""
    s = get_settings()
    otp = _generate_otp()
    payload = {"hash": _hash_otp(otp, phone_e164), "attempts": 0}
    get_redis().setex(
        f"otp:{phone_e164}",
        s.NOTIFYNOW_OTP_TTL_MINUTES * 60,
        json.dumps(payload),
    )
    return otp


def verify_otp(*, phone_e164: str, otp: str) -> bool:
    r = get_redis()
    key = f"otp:{phone_e164}"
    raw = r.get(key)
    if not raw:
        return False
    data = json.loads(raw)

    if data["attempts"] >= MAX_OTP_ATTEMPTS:
        r.delete(key)
        return False

    if hmac.compare_digest(data["hash"], _hash_otp(otp, phone_e164)):
        r.delete(key)
        return True

    # Bump attempts and re-set with same TTL.
    data["attempts"] += 1
    ttl = r.ttl(key)
    r.setex(key, max(ttl, 1), json.dumps(data))
    return False
