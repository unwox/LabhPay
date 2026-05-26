"""
Indian credit card issuer registry.
Used by parser registry (fingerprints), Resolution Assistant (support contacts),
and the frontend supported-banks strip.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Bank:
    id: str
    display_name: str
    short_name: str
    support_email: str | None
    grievance_email: str | None
    customer_care: str | None


BANKS: dict[str, Bank] = {
    "hdfc": Bank(
        id="hdfc",
        display_name="HDFC Bank",
        short_name="HDFC",
        support_email="cardservices@hdfcbank.com",
        grievance_email="grievance.redressalcell@hdfcbank.com",
        customer_care="1800-202-6161",
    ),
    "sbi": Bank(
        id="sbi",
        display_name="SBI Card",
        short_name="SBI",
        support_email="customercare@sbicard.com",
        grievance_email="nodalofficer@sbicard.com",
        customer_care="1860-180-1290",
    ),
    "icici": Bank(
        id="icici",
        display_name="ICICI Bank",
        short_name="ICICI",
        support_email="customer.care@icicibank.com",
        grievance_email="head.customerservice@icicibank.com",
        customer_care="1800-1080",
    ),
    "axis": Bank(
        id="axis",
        display_name="Axis Bank",
        short_name="Axis",
        support_email="customer.service@axisbank.com",
        grievance_email="pno@axisbank.com",
        customer_care="1860-419-5555",
    ),
    "kotak": Bank(
        id="kotak",
        display_name="Kotak Mahindra Bank",
        short_name="Kotak",
        support_email="creditcards@kotak.com",
        grievance_email="grievanceofficer@kotak.com",
        customer_care="1860-266-2666",
    ),
    "au": Bank(
        id="au",
        display_name="AU Small Finance Bank",
        short_name="AU",
        support_email="customercare@aubank.in",
        grievance_email="head.customerexperience@aubank.in",
        customer_care="1800-1200-1200",
    ),
    "onecard": Bank(
        id="onecard",
        display_name="OneCard (FPL)",
        short_name="OneCard",
        support_email="help@getonecard.app",
        grievance_email=None,
        customer_care=None,
    ),
    "indusind": Bank(
        id="indusind",
        display_name="IndusInd Bank",
        short_name="IndusInd",
        support_email="reachus@indusind.com",
        grievance_email="head.customercare@indusind.com",
        customer_care="1860-267-7777",
    ),
    "rbl": Bank(
        id="rbl",
        display_name="RBL Bank",
        short_name="RBL",
        support_email="cardservices@rblbank.com",
        grievance_email="principalnodalofficer@rblbank.com",
        customer_care="022-6232-7777",
    ),
    "amex": Bank(
        id="amex",
        display_name="American Express India",
        short_name="Amex",
        support_email="indiancustomerservice@aexp.com",
        grievance_email="manager-customerservice-india@aexp.com",
        customer_care="1800-419-1414",
    ),
    "bob": Bank(
        id="bob",
        display_name="Bank of Baroda",
        short_name="BoB",
        support_email="crm@bobfinancial.com",
        grievance_email="grievance@bobfinancial.com",
        customer_care="1800-225-100",
    ),
}


def get(bank_id: str) -> Bank | None:
    return BANKS.get(bank_id.lower())
