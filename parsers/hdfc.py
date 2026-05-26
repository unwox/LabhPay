"""HDFC Bank credit card statement parser."""

from parsers._common import BaseRegexParser


class HdfcParser(BaseRegexParser):
    bank_id = "hdfc"
    display_name = "HDFC Bank"
    must = ["HDFC Bank"]
    should = [
        "Credit Card Statement",
        "hdfcbank.com",
        "Payment Due Date",
        "Total Dues",
        "Statement Date",
    ]
