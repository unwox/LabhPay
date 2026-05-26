"""ICICI Bank credit card statement parser."""

from parsers._common import BaseRegexParser


class IciciParser(BaseRegexParser):
    bank_id = "icici"
    display_name = "ICICI Bank"
    must = ["ICICI Bank"]
    should = [
        "icicibank.com",
        "Credit Card Statement",
        "Total Amount Due",
        "Minimum Amount Due",
        "Payment Due Date",
        "Credit Limit",
    ]
