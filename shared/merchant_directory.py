"""
Stage 9 — Merchant support directory.

A small, curated set of large Indian-facing merchants where the Resolution
Assistant can offer to draft an email directly to the merchant (not the
issuer). Entries deliberately small — we'd rather omit a merchant than ship
a stale support email.

Matching is case-insensitive substring on merchant_norm/merchant_raw,
longest-key-first (same convention as shared/merchants.py).

SLA is the *expected* first-response window, in human English. Used in the
generated email to set a polite expectation.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MerchantContact:
    key: str                       # substring matched on merchant text
    display_name: str
    support_email: str | None
    grievance_email: str | None
    expected_sla: str              # human phrase, e.g. "3 business days"


# Ordered list — first match wins via the lookup helper below.
DIRECTORY: list[MerchantContact] = [
    MerchantContact("swiggy", "Swiggy",
                    "support@swiggy.in", None, "2 business days"),
    MerchantContact("zomato", "Zomato",
                    "support@zomato.com", "grievance@zomato.com", "2 business days"),
    MerchantContact("amazon", "Amazon India",
                    "cs-reply@amazon.in", "grievance-officer@amazon.in",
                    "3 business days"),
    MerchantContact("flipkart", "Flipkart",
                    "cs@flipkart.com", "grievanceofficer@flipkart.com",
                    "3 business days"),
    MerchantContact("myntra", "Myntra",
                    "support@myntra.com", "grievance.officer@myntra.com",
                    "3 business days"),
    MerchantContact("nykaa", "Nykaa",
                    "support@nykaa.com", "grievance@nykaa.com", "3 business days"),
    MerchantContact("ajio", "AJIO",
                    "care@ajio.com", "ajio.grievance@ril.com", "3 business days"),
    MerchantContact("meesho", "Meesho",
                    "help@meesho.com", "grievance@meesho.com", "3 business days"),
    MerchantContact("blinkit", "Blinkit",
                    "support@blinkit.com", None, "2 business days"),
    MerchantContact("zepto", "Zepto",
                    "support@zepto.co.in", None, "2 business days"),
    MerchantContact("bigbasket", "BigBasket",
                    "customerservice@bigbasket.com", "grievance.officer@bigbasket.com",
                    "3 business days"),
    MerchantContact("uber", "Uber India",
                    "support@uber.com", "grievanceofficer.in@uber.com",
                    "3 business days"),
    MerchantContact("ola", "Ola",
                    "support@olacabs.com", "grievance@olacabs.com",
                    "3 business days"),
    MerchantContact("rapido", "Rapido",
                    "support@rapido.bike", None, "3 business days"),
    MerchantContact("makemytrip", "MakeMyTrip",
                    "customercare@makemytrip.com", "nodalofficer@go-mmt.com",
                    "5 business days"),
    MerchantContact("yatra", "Yatra",
                    "ecare@yatra.com", "nodal.officer@yatra.com", "5 business days"),
    MerchantContact("netflix", "Netflix India",
                    "info@netflix.com", None, "3 business days"),
    MerchantContact("spotify", "Spotify India",
                    "support@spotify.com", None, "3 business days"),
    MerchantContact("prime video", "Amazon Prime Video",
                    "cs-reply@amazon.in", None, "3 business days"),
    MerchantContact("hotstar", "Disney+ Hotstar",
                    "support@hotstar.com", None, "3 business days"),
    MerchantContact("apple.com", "Apple Services",
                    "applecare.india@apple.com", None, "5 business days"),
    MerchantContact("google", "Google Play / Google One",
                    "googleplay-help@google.com", None, "5 business days"),
]


def lookup(merchant_text: str) -> MerchantContact | None:
    """Case-insensitive substring lookup against the merchant directory."""
    if not merchant_text:
        return None
    needle = merchant_text.lower()
    # Longest-key-first so 'prime video' beats nothing-like-it.
    for entry in sorted(DIRECTORY, key=lambda e: len(e.key), reverse=True):
        if entry.key in needle:
            return entry
    return None
