"""
NotifyNow WhatsApp client.

Endpoint: POST {NOTIFYNOW_BASE_URL}/send-bulk
Template: login_reference_alert (variables: 1=name, 2=otp, 3=expiry_minutes, 4=brand)

Dev fallback: if NOTIFYNOW_USERNAME is empty, the OTP is logged to stdout
and the call returns success. Lets local dev work without provisioning a
real provider account.
"""

from __future__ import annotations

import httpx

from app.core.config import get_settings

# We intentionally do NOT use the structured logger here — printing the OTP
# in dev should be very visible. In production, the dev path is unreachable
# (settings guard) so this is safe.


def send_login_otp(*, phone_e164: str, otp: str, first_name: str | None = None) -> bool:
    """
    Send a 6-digit OTP via NotifyNow's WhatsApp API.
    `phone_e164` must be of form '+91XXXXXXXXXX'. We strip the leading '+'.
    Returns True on success (HTTP 2xx), False otherwise.
    """
    s = get_settings()
    to = phone_e164.lstrip("+")

    # Dev fallback — no creds wired.
    if not s.NOTIFYNOW_USERNAME or not s.NOTIFYNOW_PASSWORD:
        print(
            "\n"
            "  ╔══════════════════════════════════════════════════╗\n"
            "  ║   [DEV] NotifyNow not configured                ║\n"
            f"  ║   OTP for {phone_e164}:  {otp}             ║\n"
            "  ║   (set NOTIFYNOW_USERNAME / PASSWORD in .env)   ║\n"
            "  ╚══════════════════════════════════════════════════╝\n",
            flush=True,
        )
        return True

    payload = {
        "username": s.NOTIFYNOW_USERNAME,
        "password": s.NOTIFYNOW_PASSWORD,
        "templateName": s.NOTIFYNOW_TEMPLATE,
        "campaignName": s.NOTIFYNOW_CAMPAIGN,
        "numbers": [
            {
                "to": to,
                "variables": {
                    "1": (first_name or "there"),
                    "2": otp,
                    "3": str(s.NOTIFYNOW_OTP_TTL_MINUTES),
                    "4": s.APP_BRAND,
                },
            }
        ],
    }

    url = f"{s.NOTIFYNOW_BASE_URL.rstrip('/')}/send-bulk"
    try:
        with httpx.Client(timeout=8.0) as client:
            r = client.post(url, json=payload)
        return 200 <= r.status_code < 300
    except httpx.HTTPError:
        return False
