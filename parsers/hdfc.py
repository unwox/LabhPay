"""HDFC Bank credit card statement parser."""

from parsers._common import BaseRegexParser


class HdfcParser(BaseRegexParser):
    bank_id = "hdfc"
    display_name = "HDFC Bank"
    must = ["HDFC Bank"]
    # Cover both the legacy single-table statement layout (Payment Due Date,
    # Total Dues, Statement Date) AND the modern 4-page Billed-statements
    # layout (TOTAL AMOUNT DUE / MINIMUM DUE / DUE DATE / Domestic
    # Transactions / Reward Points / Card No.).
    should = [
        "Credit Card Statement",
        "hdfcbank.com",
        "Payment Due Date",
        "Total Dues",
        "Statement Date",
        "TOTAL AMOUNT DUE",
        "MINIMUM DUE",
        "Domestic Transactions",
        "Reward Points",
        "Credit Card No",
    ]
