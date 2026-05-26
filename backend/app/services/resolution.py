"""
Stage 9 — Resolution Assistant.

Two responsibilities:
  1. List the actions a user can take on a single transaction.
  2. Generate a draft email for the chosen action — addressed to the
     correct party (bank vs. merchant), with the transaction prefilled.

We do this *deterministically* with templates rather than asking the LLM
to write the email itself. The verify gate is "professional, correct
details, respect masking" — that's a templates-job. The LLM can polish a
template later, but the baseline must always work even without AI.

Templates ship in English ('en') and simple Hindi ('hi'). The Hindi
versions are intentionally short and free of legalese — clarity over
formality, since the recipient is a customer-service queue.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Literal

from shared.banks import Bank, get as get_bank
from shared.merchant_directory import MerchantContact, lookup as lookup_merchant
from shared.schemas import Statement, Transaction

Language = Literal["en", "hi"]


# ---------- action registry ----------

@dataclass(frozen=True)
class Action:
    id: str
    label_en: str
    label_hi: str
    blurb_en: str
    blurb_hi: str
    recipient: Literal["bank", "merchant", "either"]


ACTIONS: list[Action] = [
    Action(
        id="dispute",
        label_en="Dispute this charge",
        label_hi="यह चार्ज विवादित करें",
        blurb_en="Tell the bank you don't recognise this charge and want it reversed.",
        blurb_hi="बैंक को बताएं कि यह चार्ज आपको याद नहीं है और इसे वापस मांगें।",
        recipient="bank",
    ),
    Action(
        id="refund",
        label_en="Request a refund",
        label_hi="रिफंड की मांग करें",
        blurb_en="Ask the merchant for a refund on a paid order or service.",
        blurb_hi="मर्चेंट से किसी ऑर्डर या सेवा का रिफंड मांगें।",
        recipient="merchant",
    ),
    Action(
        id="cancel_subscription",
        label_en="Cancel subscription",
        label_hi="सब्सक्रिप्शन रद्द करें",
        blurb_en="Tell the merchant to stop auto-renewing this subscription on your card.",
        blurb_hi="मर्चेंट को बताएं कि इस कार्ड पर सब्सक्रिप्शन का ऑटो-रिन्यू बंद करें।",
        recipient="merchant",
    ),
    Action(
        id="unauthorized",
        label_en="Report as unauthorized",
        label_hi="अनधिकृत के रूप में रिपोर्ट करें",
        blurb_en="You did not make this charge. Bank will block the card and investigate.",
        blurb_hi="यह चार्ज आपने नहीं किया। बैंक कार्ड ब्लॉक करेगा और जांच करेगा।",
        recipient="bank",
    ),
    Action(
        id="invoice",
        label_en="Request an invoice / receipt",
        label_hi="इनवॉइस / रसीद मांगें",
        blurb_en="Ask the merchant for a GST invoice for this transaction.",
        blurb_hi="इस ट्रांज़ैक्शन के लिए मर्चेंट से GST इनवॉइस मांगें।",
        recipient="merchant",
    ),
    Action(
        id="merchant_complaint",
        label_en="Complain to the merchant",
        label_hi="मर्चेंट को शिकायत भेजें",
        blurb_en="Raise a service complaint about this charge directly with the merchant.",
        blurb_hi="इस चार्ज के बारे में सीधे मर्चेंट को शिकायत दर्ज करें।",
        recipient="merchant",
    ),
    Action(
        id="emi_closure",
        label_en="Foreclose this EMI",
        label_hi="EMI जल्दी बंद करें",
        blurb_en="Tell the bank you want to prepay and close this EMI conversion.",
        blurb_hi="बैंक को बताएं कि आप इस EMI को पहले बंद करना चाहते हैं।",
        recipient="bank",
    ),
    Action(
        id="duplicate",
        label_en="Flag duplicate charge",
        label_hi="डुप्लिकेट चार्ज की रिपोर्ट करें",
        blurb_en="Same merchant, same amount, same day — likely charged twice.",
        blurb_hi="एक ही मर्चेंट, एक ही अमाउंट, एक ही दिन — शायद दो बार चार्ज हुआ।",
        recipient="bank",
    ),
    Action(
        id="escalate",
        label_en="Escalate to grievance officer",
        label_hi="ग्रीवांस ऑफिसर तक एस्कलेट करें",
        blurb_en="Move to the bank's senior grievance address if first-line support didn't resolve.",
        blurb_hi="पहले स्तर पर समाधान नहीं हुआ तो बैंक के ग्रीवांस ऑफिसर को भेजें।",
        recipient="bank",
    ),
]

_BY_ID: dict[str, Action] = {a.id: a for a in ACTIONS}


def get_action(action_id: str) -> Action | None:
    return _BY_ID.get(action_id)


# ---------- gating ----------

def applicable_actions(
    txn: Transaction,
    *,
    has_duplicate: bool = False,
) -> list[Action]:
    """Return the subset of actions that make sense for this transaction."""
    out: list[Action] = []
    is_credit = not txn.is_debit
    is_emi = bool(txn.is_emi)
    is_sub_like = txn.category.value == "subscriptions"

    # Always available bank-side actions
    out.append(_BY_ID["dispute"])
    out.append(_BY_ID["unauthorized"])

    # Merchant actions — only if we have a known merchant or any merchant string.
    out.append(_BY_ID["refund"])
    out.append(_BY_ID["invoice"])
    out.append(_BY_ID["merchant_complaint"])

    if is_sub_like:
        out.append(_BY_ID["cancel_subscription"])
    if is_emi:
        out.append(_BY_ID["emi_closure"])
    if has_duplicate:
        out.append(_BY_ID["duplicate"])
    if is_credit:
        # A credit is unlikely to need disputes/refunds — keep escalate only.
        out = [_BY_ID["escalate"]]
        return out

    out.append(_BY_ID["escalate"])
    return out


# ---------- formatting helpers ----------

def _f(x) -> float:
    if x is None:
        return 0.0
    if isinstance(x, Decimal):
        return float(x)
    return float(x)


def _inr(amount: Decimal | float) -> str:
    n = _f(amount)
    return f"₹{n:,.0f}" if abs(n - round(n)) < 0.005 else f"₹{n:,.2f}"


def _mask_last4(last4: str | None) -> str:
    if not last4 or len(last4) != 4 or not last4.isdigit():
        return "**** **** **** ****"
    return f"**** **** **** {last4}"


def _date_human(d: date) -> str:
    return d.strftime("%d %b %Y")


# ---------- recipient resolution ----------

@dataclass
class Recipient:
    kind: Literal["bank", "merchant", "unknown"]
    name: str
    email: str | None
    secondary_email: str | None = None
    expected_sla: str | None = None


def resolve_recipient(
    *, action: Action, txn: Transaction, statement: Statement,
) -> Recipient:
    if action.recipient == "bank":
        b = get_bank(statement.meta.bank_id) or _generic_bank(statement)
        # 'escalate' specifically targets the grievance address when we have one.
        primary = b.grievance_email if action.id == "escalate" else b.support_email
        secondary = b.support_email if action.id == "escalate" else b.grievance_email
        return Recipient(
            kind="bank",
            name=b.display_name,
            email=primary,
            secondary_email=secondary,
            expected_sla=None,
        )
    # merchant action
    m: MerchantContact | None = lookup_merchant(txn.merchant_norm or txn.merchant_raw or "")
    if m:
        return Recipient(
            kind="merchant",
            name=m.display_name,
            email=m.support_email,
            secondary_email=m.grievance_email,
            expected_sla=m.expected_sla,
        )
    # Unknown merchant — still give the user a useful draft they can paste
    # into a found-elsewhere email address.
    return Recipient(
        kind="unknown",
        name=(txn.merchant_norm or txn.merchant_raw or "the merchant"),
        email=None,
        expected_sla=None,
    )


def _generic_bank(statement: Statement) -> Bank:
    return Bank(
        id=statement.meta.bank_id,
        display_name=statement.meta.bank_display or "the issuing bank",
        short_name=statement.meta.bank_display or "Bank",
        support_email=None,
        grievance_email=None,
        customer_care=None,
    )


# ---------- email templates ----------

@dataclass
class EmailDraft:
    subject: str
    body: str
    recipient: Recipient
    language: Language
    action_id: str
    notes: list[str] = field(default_factory=list)


def _ctx(txn: Transaction, statement: Statement) -> dict:
    return {
        "merchant": txn.merchant_norm or txn.merchant_raw or "merchant",
        "amount": _inr(txn.amount),
        "date": _date_human(txn.txn_date),
        "card": _mask_last4(statement.meta.card_last4),
        "bank": statement.meta.bank_display or "the issuing bank",
        "txn_ref": txn.id,
    }


def _sub_en(action_id: str, c: dict) -> str:
    return {
        "dispute":            f"Dispute: ₹ charge at {c['merchant']} on {c['date']}",
        "refund":             f"Refund request — {c['merchant']} order on {c['date']}",
        "cancel_subscription":f"Cancel auto-renewal — {c['merchant']}",
        "unauthorized":       f"Unauthorized charge on card {c['card']}",
        "invoice":            f"GST invoice request — {c['merchant']} on {c['date']}",
        "merchant_complaint": f"Service complaint — {c['merchant']} on {c['date']}",
        "emi_closure":        f"EMI foreclosure request — {c['merchant']}, {c['date']}",
        "duplicate":          f"Possible duplicate charge — {c['merchant']} on {c['date']}",
        "escalate":           f"Escalation: unresolved dispute on card {c['card']}",
    }[action_id]


def _sub_hi(action_id: str, c: dict) -> str:
    return {
        "dispute":            f"विवाद: {c['merchant']} पर {c['date']} को चार्ज",
        "refund":             f"रिफंड अनुरोध — {c['merchant']}, {c['date']}",
        "cancel_subscription":f"ऑटो-रिन्यू बंद करें — {c['merchant']}",
        "unauthorized":       f"कार्ड {c['card']} पर अनधिकृत चार्ज",
        "invoice":            f"GST इनवॉइस अनुरोध — {c['merchant']}, {c['date']}",
        "merchant_complaint": f"शिकायत — {c['merchant']}, {c['date']}",
        "emi_closure":        f"EMI जल्दी बंद करने का अनुरोध — {c['merchant']}, {c['date']}",
        "duplicate":          f"डुप्लिकेट चार्ज — {c['merchant']}, {c['date']}",
        "escalate":           f"एस्कलेशन: कार्ड {c['card']} पर अनसुलझा विवाद",
    }[action_id]


def _body_en(action: Action, c: dict, r: Recipient) -> str:
    salutation = f"Hello {r.name} team,"
    sign = "Regards,\n[Your name]\n[Your registered mobile]"
    txn_block = (
        f"Transaction details:\n"
        f"  • Merchant: {c['merchant']}\n"
        f"  • Amount:   {c['amount']}\n"
        f"  • Date:     {c['date']}\n"
        f"  • Card:     {c['card']} ({c['bank']})\n"
        f"  • Ref:      {c['txn_ref']}"
    )
    body_map = {
        "dispute": (
            f"{salutation}\n\n"
            f"I would like to dispute the following charge on my credit "
            f"card. I do not recognise it / it does not match a purchase I made.\n\n"
            f"{txn_block}\n\n"
            f"Please reverse this charge and confirm in writing. Let me know "
            f"if you need any further information from my side.\n\n"
            f"{sign}"
        ),
        "refund": (
            f"{salutation}\n\n"
            f"I'm writing to request a refund for the order/transaction below.\n\n"
            f"{txn_block}\n\n"
            f"Reason for the refund: [briefly describe — e.g. order not "
            f"delivered, wrong item, service not provided].\n\n"
            f"Please process the refund to the same card and share an "
            f"acknowledgement.\n\n"
            f"{sign}"
        ),
        "cancel_subscription": (
            f"{salutation}\n\n"
            f"Please cancel the auto-renewal of my subscription billed to "
            f"the card ending {c['card'][-4:]}. The most recent charge "
            f"reference for context is below.\n\n"
            f"{txn_block}\n\n"
            f"Kindly confirm the cancellation in writing and ensure no "
            f"further charges are placed on this card.\n\n"
            f"{sign}"
        ),
        "unauthorized": (
            f"{salutation}\n\n"
            f"I'm reporting an unauthorized charge on my credit card. I did "
            f"not make this transaction and request immediate action.\n\n"
            f"{txn_block}\n\n"
            f"Please block the card to prevent further misuse, raise a "
            f"dispute, and share the next-steps reference number. I'm "
            f"available on the registered mobile for verification.\n\n"
            f"{sign}"
        ),
        "invoice": (
            f"{salutation}\n\n"
            f"Could you please share a GST invoice for the transaction "
            f"below? I need it for my records.\n\n"
            f"{txn_block}\n\n"
            f"If you need any additional details (GSTIN, billing address), "
            f"reply to this email and I'll share them.\n\n"
            f"{sign}"
        ),
        "merchant_complaint": (
            f"{salutation}\n\n"
            f"I'd like to register a complaint regarding the service "
            f"linked to this charge.\n\n"
            f"{txn_block}\n\n"
            f"Issue summary: [describe what went wrong in 2-3 sentences].\n\n"
            f"Could you investigate and reply with the outcome and any "
            f"compensation or refund eligibility?\n\n"
            f"{sign}"
        ),
        "emi_closure": (
            f"{salutation}\n\n"
            f"I'd like to foreclose / prepay the EMI conversion linked to "
            f"the transaction below.\n\n"
            f"{txn_block}\n\n"
            f"Please share the outstanding principal, any foreclosure "
            f"charges, and the steps to settle this in full so the EMI is "
            f"removed from upcoming statements.\n\n"
            f"{sign}"
        ),
        "duplicate": (
            f"{salutation}\n\n"
            f"I noticed what appears to be a duplicate charge from the "
            f"same merchant on the same day for the same amount.\n\n"
            f"{txn_block}\n\n"
            f"Please investigate and reverse the duplicate charge. I'm "
            f"happy to share screenshots of the statement if needed.\n\n"
            f"{sign}"
        ),
        "escalate": (
            f"{salutation}\n\n"
            f"I'm escalating an unresolved issue on my credit card "
            f"({c['card']}, {c['bank']}). My first attempt with customer "
            f"support did not lead to a resolution.\n\n"
            f"{txn_block}\n\n"
            f"Original complaint summary: [add the gist + earlier "
            f"reference number]. Could you take this up at the grievance "
            f"level and share a written resolution within the regulatory "
            f"timeline?\n\n"
            f"{sign}"
        ),
    }
    return body_map[action.id]


def _body_hi(action: Action, c: dict, r: Recipient) -> str:
    salutation = f"नमस्ते {r.name} टीम,"
    sign = "धन्यवाद,\n[आपका नाम]\n[आपका रजिस्टर्ड मोबाइल]"
    txn_block = (
        f"ट्रांज़ैक्शन विवरण:\n"
        f"  • मर्चेंट: {c['merchant']}\n"
        f"  • अमाउंट: {c['amount']}\n"
        f"  • तारीख: {c['date']}\n"
        f"  • कार्ड: {c['card']} ({c['bank']})\n"
        f"  • रेफ:   {c['txn_ref']}"
    )
    body_map = {
        "dispute": (
            f"{salutation}\n\n"
            f"मैं इस चार्ज पर विवाद दर्ज करना चाहता/चाहती हूं। यह चार्ज मुझे याद नहीं है।\n\n"
            f"{txn_block}\n\n"
            f"कृपया इसे रिवर्स करें और लिखित में पुष्टि करें।\n\n"
            f"{sign}"
        ),
        "refund": (
            f"{salutation}\n\n"
            f"नीचे दिए ट्रांज़ैक्शन का रिफंड चाहिए।\n\n"
            f"{txn_block}\n\n"
            f"रिफंड का कारण: [संक्षेप में लिखें]\n\n"
            f"कृपया उसी कार्ड पर रिफंड करें।\n\n"
            f"{sign}"
        ),
        "cancel_subscription": (
            f"{salutation}\n\n"
            f"कृपया मेरे कार्ड ({c['card']}) पर लगी इस सब्सक्रिप्शन का ऑटो-रिन्यू बंद करें।\n\n"
            f"{txn_block}\n\n"
            f"लिखित पुष्टि भेजें।\n\n"
            f"{sign}"
        ),
        "unauthorized": (
            f"{salutation}\n\n"
            f"यह चार्ज मैंने नहीं किया है। कृपया कार्ड तुरंत ब्लॉक करें और जांच शुरू करें।\n\n"
            f"{txn_block}\n\n"
            f"{sign}"
        ),
        "invoice": (
            f"{salutation}\n\n"
            f"कृपया नीचे के ट्रांज़ैक्शन की GST इनवॉइस भेजें।\n\n"
            f"{txn_block}\n\n"
            f"{sign}"
        ),
        "merchant_complaint": (
            f"{salutation}\n\n"
            f"इस चार्ज से जुड़ी सेवा पर शिकायत है।\n\n"
            f"{txn_block}\n\n"
            f"समस्या: [2-3 वाक्य में लिखें]\n\n"
            f"कृपया जांच कर के जवाब दें।\n\n"
            f"{sign}"
        ),
        "emi_closure": (
            f"{salutation}\n\n"
            f"मैं इस EMI को जल्दी बंद करना चाहता/चाहती हूं।\n\n"
            f"{txn_block}\n\n"
            f"कृपया बाकी मूलधन और फोरक्लोज़र चार्ज की जानकारी भेजें।\n\n"
            f"{sign}"
        ),
        "duplicate": (
            f"{salutation}\n\n"
            f"लगता है एक ही मर्चेंट से एक ही दिन एक जैसा चार्ज दो बार लगा है।\n\n"
            f"{txn_block}\n\n"
            f"कृपया जांच कर डुप्लिकेट चार्ज वापस करें।\n\n"
            f"{sign}"
        ),
        "escalate": (
            f"{salutation}\n\n"
            f"मेरे कार्ड ({c['card']}, {c['bank']}) पर एक अनसुलझी शिकायत है। पहले स्तर पर समाधान नहीं हुआ।\n\n"
            f"{txn_block}\n\n"
            f"मूल शिकायत का सार: [संक्षेप + पुरानी रेफरेंस]। कृपया ग्रीवांस लेवल पर लें।\n\n"
            f"{sign}"
        ),
    }
    return body_map[action.id]


def draft_email(
    *,
    action: Action,
    txn: Transaction,
    statement: Statement,
    language: Language = "en",
) -> EmailDraft:
    c = _ctx(txn, statement)
    recipient = resolve_recipient(action=action, txn=txn, statement=statement)
    subject = _sub_en(action.id, c) if language == "en" else _sub_hi(action.id, c)
    body = _body_en(action, c, recipient) if language == "en" else _body_hi(action, c, recipient)
    notes: list[str] = []
    if recipient.email is None:
        notes.append(
            "We don't have a verified email for this recipient. Use the bank "
            "or merchant's official support page to find the right address."
            if language == "en" else
            "इस रिसीवर का ईमेल हमारे पास नहीं है। ऑफिशियल सपोर्ट पेज से ईमेल लें।"
        )
    if recipient.expected_sla:
        notes.append(
            f"Expected first response: {recipient.expected_sla}."
            if language == "en" else
            f"पहली प्रतिक्रिया अपेक्षित: {recipient.expected_sla}."
        )
    return EmailDraft(
        subject=subject,
        body=body,
        recipient=recipient,
        language=language,
        action_id=action.id,
        notes=notes,
    )
