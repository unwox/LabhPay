"""
Indian merchant → category mapping.

The categorizer in Stage 5 layers on top of this with regex, embeddings,
and (only as last resort) an LLM call.

Key matching is case-insensitive substring; longer keys are tried first
so 'amazon pay' wins over 'amazon'.
"""

from shared.categories import Category

# Stage 1 starter set — expanded in Stage 5.
MERCHANT_MAP: dict[str, Category] = {
    # Food delivery
    "swiggy": Category.FOOD,
    "zomato": Category.FOOD,
    "eatfit": Category.FOOD,
    "faasos": Category.FOOD,
    "dominos": Category.FOOD,
    "pizza hut": Category.FOOD,
    "mcdonalds": Category.FOOD,
    "starbucks": Category.FOOD,
    # Q-commerce / Groceries
    "blinkit": Category.GROCERIES,
    "zepto": Category.GROCERIES,
    "bigbasket": Category.GROCERIES,
    "dunzo": Category.GROCERIES,
    "instamart": Category.GROCERIES,
    # Ecommerce
    "amazon": Category.SHOPPING,
    "flipkart": Category.SHOPPING,
    "myntra": Category.SHOPPING,
    "ajio": Category.SHOPPING,
    "nykaa": Category.SHOPPING,
    "meesho": Category.SHOPPING,
    "tata cliq": Category.SHOPPING,
    # Travel
    "ola": Category.TRAVEL,
    "uber": Category.TRAVEL,
    "rapido": Category.TRAVEL,
    "irctc": Category.TRAVEL,
    "makemytrip": Category.TRAVEL,
    "yatra": Category.TRAVEL,
    "ixigo": Category.TRAVEL,
    "indigo": Category.TRAVEL,
    "vistara": Category.TRAVEL,
    "airindia": Category.TRAVEL,
    # Fuel
    "indian oil": Category.FUEL,
    "iocl": Category.FUEL,
    "bharat petroleum": Category.FUEL,
    "bpcl": Category.FUEL,
    "hindustan petroleum": Category.FUEL,
    "hpcl": Category.FUEL,
    "reliance petrol": Category.FUEL,
    # Telecom
    "airtel": Category.TELECOM,
    "jio": Category.TELECOM,
    "vi ": Category.TELECOM,  # Vodafone Idea
    "vodafone": Category.TELECOM,
    "bsnl": Category.TELECOM,
    # Utilities (electricity / gas / water often via aggregators)
    "tata power": Category.UTILITIES,
    "adani electricity": Category.UTILITIES,
    "bescom": Category.UTILITIES,
    # Subscriptions / OTT
    "netflix": Category.SUBSCRIPTIONS,
    "spotify": Category.SUBSCRIPTIONS,
    "prime video": Category.SUBSCRIPTIONS,
    "amazon prime": Category.SUBSCRIPTIONS,
    "hotstar": Category.SUBSCRIPTIONS,
    "youtube premium": Category.SUBSCRIPTIONS,
    "sony liv": Category.SUBSCRIPTIONS,
    "zee5": Category.SUBSCRIPTIONS,
    "apple.com": Category.SUBSCRIPTIONS,
    "google one": Category.SUBSCRIPTIONS,
    # Wallets / Payment aggregators (will be re-routed by Stage 5 logic;
    # raw mapping treats them as 'other' to avoid mis-categorization).
    "paytm": Category.OTHER,
    "phonepe": Category.OTHER,
    "razorpay": Category.OTHER,
    "bharatpe": Category.OTHER,
    "cred ": Category.OTHER,
    # Healthcare
    "1mg": Category.HEALTHCARE,
    "pharmeasy": Category.HEALTHCARE,
    "apollo": Category.HEALTHCARE,
    "practo": Category.HEALTHCARE,
    # Investment
    "zerodha": Category.INVESTMENT,
    "groww": Category.INVESTMENT,
    "upstox": Category.INVESTMENT,
    "kuvera": Category.INVESTMENT,
    # Insurance
    "policybazaar": Category.INSURANCE,
    "acko": Category.INSURANCE,
    "hdfc ergo": Category.INSURANCE,
    # Gaming
    "dream11": Category.GAMING,
    "mpl ": Category.GAMING,
    "rummy": Category.GAMING,
}


def lookup(merchant_text: str) -> Category | None:
    """Case-insensitive substring lookup, longest-key-first."""
    if not merchant_text:
        return None
    needle = merchant_text.lower()
    for key in sorted(MERCHANT_MAP.keys(), key=len, reverse=True):
        if key in needle:
            return MERCHANT_MAP[key]
    return None
