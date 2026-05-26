"""Indian phone number normalization."""

from __future__ import annotations

import re


class InvalidPhoneError(ValueError):
    pass


_DIGIT_RE = re.compile(r"\D+")


def normalize_indian_mobile(raw: str) -> str:
    """
    Accept '+91XXXXXXXXXX', '91XXXXXXXXXX', 'XXXXXXXXXX' (10 digits).
    Returns E.164 '+91XXXXXXXXXX'. First subscriber digit must be 6-9.
    """
    if not raw:
        raise InvalidPhoneError("Phone is required.")
    digits = _DIGIT_RE.sub("", raw)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10 or digits[0] not in "6789":
        raise InvalidPhoneError("Enter a valid Indian mobile number.")
    return f"+91{digits}"
