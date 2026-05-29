"""
Canonical transaction categories.
UI labels are localized in the frontend; backend uses the enum keys.
"""

from enum import Enum


class Category(str, Enum):
    FOOD = "food"
    GROCERIES = "groceries"
    SHOPPING = "shopping"
    TRAVEL = "travel"
    SUBSCRIPTIONS = "subscriptions"
    FUEL = "fuel"
    UTILITIES = "utilities"
    TELECOM = "telecom"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    INSURANCE = "insurance"
    EMI = "emi"
    ENTERTAINMENT = "entertainment"
    GAMING = "gaming"
    INVESTMENT = "investment"
    HOME_SERVICES = "home_services"
    OTHER = "other"


# Display order for UI tiles / donut charts.
CATEGORY_ORDER: list[Category] = [
    Category.FOOD,
    Category.GROCERIES,
    Category.SHOPPING,
    Category.TRAVEL,
    Category.FUEL,
    Category.UTILITIES,
    Category.TELECOM,
    Category.SUBSCRIPTIONS,
    Category.ENTERTAINMENT,
    Category.HEALTHCARE,
    Category.EDUCATION,
    Category.HOME_SERVICES,
    Category.INSURANCE,
    Category.EMI,
    Category.INVESTMENT,
    Category.GAMING,
    Category.OTHER,
]
