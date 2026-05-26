"""
PII masking helpers. Used at parser boundary and as outbound LLM backstop.
Never log, persist, or transmit a raw PAN. Mask first, always.
"""

import re

# 13–19 digit sequences (with optional spaces/dashes) — credit/debit card PANs.
_PAN_RE = re.compile(r"\b(?:\d[\s-]?){12,18}\d\b")
_PHONE_E164_RE = re.compile(r"\+?91[\s-]?\d{5}[\s-]?\d{5}")
_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")


def mask_card_number(s: str) -> str:
    """Replace any PAN-shaped sequence with **** **** **** XXXX."""
    def _repl(m: re.Match) -> str:
        digits = re.sub(r"\D", "", m.group(0))
        if len(digits) < 8:
            return m.group(0)
        last4 = digits[-4:]
        return f"**** **** **** {last4}"
    return _PAN_RE.sub(_repl, s)


def mask_phone(s: str) -> str:
    return _PHONE_E164_RE.sub("+91 XXXXX XXXXX", s)


def mask_email(s: str) -> str:
    def _repl(m: re.Match) -> str:
        local, _, domain = m.group(0).partition("@")
        head = local[:2] if len(local) > 2 else local[:1]
        return f"{head}***@{domain}"
    return _EMAIL_RE.sub(_repl, s)


def scrub_for_logs(s: str) -> str:
    """Apply all maskers — use before logging any user-derived string."""
    return mask_email(mask_phone(mask_card_number(s)))


def last4_from_pan(pan: str) -> str | None:
    digits = re.sub(r"\D", "", pan or "")
    return digits[-4:] if len(digits) >= 4 else None
