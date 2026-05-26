"""SBI Card credit card statement parser."""

from parsers._common import BaseRegexParser


class SbiParser(BaseRegexParser):
    bank_id = "sbi"
    display_name = "SBI Card"
    must = ["SBI Card"]
    should = [
        "sbicard.com",
        "Total Amount Due",
        "Minimum Amount Due",
        "Payment Due Date",
        "Statement Date",
        "Credit Limit",
    ]
