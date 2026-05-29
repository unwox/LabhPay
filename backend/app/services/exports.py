"""
Stage 9 — Export Center.

Five report types, all generated server-side with reportlab, streamed to
the client, never persisted:

  - summary           : top-of-mind view of the loaded statements
  - yearly            : per-month spend table for the calendar year so far
  - categories        : category-by-category totals + share
  - subscriptions     : every recurring merchant we detected
  - tax_summary       : a tax-friendly breakdown (insurance / investment /
                        healthcare / GST paid via finance charges)

Each report uses a consistent brand-aligned look (deep ink + accent
emerald), Devanagari-safe header text, and a privacy footer note. We
deliberately keep the styling restrained: nothing here is decorative.
"""

from __future__ import annotations

import io
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Callable, Iterable

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from shared.categories import CATEGORY_ORDER, Category
from shared.schemas import Statement, Transaction

# ---------- brand ----------

INK = colors.HexColor("#0F1714")
INK_SOFT = colors.HexColor("#3A4540")
INK_MUTED = colors.HexColor("#6B7570")
PAPER = colors.HexColor("#F7F5F1")
PAPER_WARM = colors.HexColor("#EEEAE2")
ACCENT = colors.HexColor("#1B7A4B")
ACCENT_INK = colors.HexColor("#0B5A35")
ACCENT_MIST = colors.HexColor("#E2F0EA")


# ---------- formatting ----------

def _f(x) -> float:
    if x is None:
        return 0.0
    if isinstance(x, Decimal):
        return float(x)
    return float(x)


def _inr(n: float) -> str:
    """Indian comma grouping with an 'Rs ' prefix.

    We deliberately avoid the ₹ glyph (U+20B9) here because the PDF is
    rendered with the standard PostScript Helvetica family, which has no
    glyph for it — every amount would otherwise render as a black square.
    'Rs' is the conventional fallback used by most Indian bank PDFs."""
    sign = "-" if n < 0 else ""
    n_abs = abs(n)
    integer = int(n_abs)
    decimal = n_abs - integer
    # Indian grouping: last 3 digits, then every 2.
    s = str(integer)
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        head = ",".join(
            [head[max(0, len(head) - 2 * i - 2): len(head) - 2 * i] for i in range((len(head) + 1) // 2)][::-1]
        )
        s = f"{head},{tail}"
    if decimal >= 0.005:
        return f"{sign}Rs {s}.{int(round(decimal * 100)):02d}"
    return f"{sign}Rs {s}"


def _label(value: str) -> str:
    """Human-readable label for enum values like 'home_services' →
    'Home Services'."""
    return value.replace("_", " ").title()


def _mask(last4: str | None) -> str:
    if not last4 or len(last4) != 4:
        return "**** **** **** ****"
    return f"**** **** **** {last4}"


# ---------- page chrome ----------

def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "eyebrow": ParagraphStyle(
            "eyebrow", parent=base["Normal"],
            textColor=INK_MUTED, fontName="Helvetica",
            fontSize=8, leading=10, spaceAfter=2, alignment=TA_LEFT,
            uppercase=False,
        ),
        "h1": ParagraphStyle(
            "h1", parent=base["Heading1"], fontName="Helvetica-Bold",
            fontSize=24, leading=28, textColor=INK, spaceAfter=6,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=14, leading=18, textColor=INK, spaceBefore=18, spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"], fontName="Helvetica",
            fontSize=10.5, leading=15, textColor=INK_SOFT,
        ),
        "muted": ParagraphStyle(
            "muted", parent=base["Normal"], fontName="Helvetica",
            fontSize=9, leading=12, textColor=INK_MUTED,
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"], fontName="Helvetica",
            fontSize=8, leading=10, textColor=INK_MUTED,
        ),
    }


def _page_chrome(title: str) -> Callable:
    def _draw(canvas, doc):
        w, h = A4
        canvas.saveState()
        # Header strip
        canvas.setFillColor(PAPER)
        canvas.rect(0, h - 22 * mm, w, 22 * mm, fill=1, stroke=0)
        canvas.setFillColor(INK)
        canvas.setFont("Helvetica-Bold", 12)
        canvas.drawString(18 * mm, h - 12 * mm, "LabhPay")
        canvas.setFillColor(INK_MUTED)
        canvas.setFont("Helvetica", 9)
        canvas.drawString(18 * mm, h - 17 * mm, title)
        canvas.setFont("Helvetica", 8)
        gen = datetime.now(timezone.utc).strftime("%d %b %Y · %H:%M UTC")
        canvas.drawRightString(w - 18 * mm, h - 12 * mm, gen)
        # Accent rule
        canvas.setStrokeColor(ACCENT)
        canvas.setLineWidth(0.8)
        canvas.line(18 * mm, h - 22 * mm, w - 18 * mm, h - 22 * mm)
        # Footer
        canvas.setFillColor(INK_MUTED)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(
            18 * mm, 12 * mm,
            "Generated from your statements — auto-deleted with your session. "
            "Never stored on our servers.",
        )
        canvas.drawRightString(
            w - 18 * mm, 12 * mm, f"Page {doc.page}",
        )
        canvas.restoreState()
    return _draw


def _make_doc(title: str) -> tuple[BaseDocTemplate, io.BytesIO]:
    buf = io.BytesIO()
    doc = BaseDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=30 * mm, bottomMargin=20 * mm,
        title=title, author="LabhPay",
    )
    frame = Frame(
        doc.leftMargin, doc.bottomMargin,
        doc.width, doc.height, id="body",
    )
    template = PageTemplate(id="main", frames=[frame], onPage=_page_chrome(title))
    doc.addPageTemplates([template])
    return doc, buf


def _table(rows: list[list], col_widths: list[float], *, head: bool = True) -> Table:
    t = Table(rows, colWidths=col_widths)
    cmds = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK_SOFT),
        ("ROWBACKGROUNDS", (0, 1 if head else 0), (-1, -1), [PAPER, colors.white]),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, INK_MUTED),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if head:
        cmds.extend([
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("BACKGROUND", (0, 0), (-1, 0), PAPER_WARM),
            ("TEXTCOLOR", (0, 0), (-1, 0), INK),
        ])
    t.setStyle(TableStyle(cmds))
    return t


# ---------- aggregators ----------

@dataclass
class Aggregates:
    debits: list[Transaction]
    credits: list[Transaction]
    total_debit: float
    total_credit: float
    finance: float
    gst: float
    late: float
    overlimit: float
    months: list[date]


def _all_txns(statements: list[Statement]) -> Iterable[Transaction]:
    for s in statements:
        for t in s.transactions:
            yield t


def _aggregate(statements: list[Statement]) -> Aggregates:
    debits = [t for t in _all_txns(statements) if t.is_debit]
    credits = [t for t in _all_txns(statements) if not t.is_debit]
    months = sorted({t.txn_date.replace(day=1) for t in debits + credits})
    return Aggregates(
        debits=debits,
        credits=credits,
        total_debit=sum(_f(t.amount) for t in debits),
        total_credit=sum(_f(t.amount) for t in credits),
        finance=sum(_f(s.meta.finance_charges) for s in statements),
        gst=sum(_f(s.meta.gst_on_charges) for s in statements),
        late=sum(_f(s.meta.late_fee_charges) for s in statements),
        overlimit=sum(_f(s.meta.overlimit_charges) for s in statements),
        months=months,
    )


# ---------- reports ----------

def _statements_block(statements: list[Statement], styles: dict) -> list:
    rows = [["Bank", "Card", "Period", "Outstanding", "Min. due"]]
    for s in statements:
        period = (
            f"{s.meta.statement_start.isoformat() if s.meta.statement_start else '—'} → "
            f"{s.meta.statement_end.isoformat() if s.meta.statement_end else '—'}"
        )
        rows.append([
            s.meta.bank_display or s.meta.bank_id,
            _mask(s.meta.card_last4),
            period,
            _inr(_f(s.meta.total_outstanding)),
            _inr(_f(s.meta.minimum_due)),
        ])
    return [
        Paragraph("Loaded statements", styles["h2"]),
        _table(rows, [40 * mm, 38 * mm, 50 * mm, 26 * mm, 22 * mm]),
    ]


def build_summary_pdf(statements: list[Statement]) -> bytes:
    doc, buf = _make_doc("Summary report")
    styles = _styles()
    story: list = []
    agg = _aggregate(statements)

    story.append(Paragraph("Statement summary", styles["h1"]))
    if not statements:
        story.append(Paragraph("No statements loaded.", styles["body"]))
        doc.build(story)
        return buf.getvalue()

    period_str = (
        f"{agg.months[0].strftime('%b %Y')} – {agg.months[-1].strftime('%b %Y')}"
        if agg.months else "—"
    )
    story.append(Paragraph(
        f"Covering {len(statements)} statement{'s' if len(statements) != 1 else ''} · {period_str}",
        styles["muted"],
    ))
    story.append(Spacer(1, 8))

    rows = [
        ["Metric", "Value"],
        ["Total spending", _inr(agg.total_debit)],
        ["Total credits / refunds", _inr(agg.total_credit)],
        ["Finance charges", _inr(agg.finance)],
        ["GST on charges", _inr(agg.gst)],
        ["Late fees", _inr(agg.late)],
        ["Over-limit fees", _inr(agg.overlimit)],
        ["Transactions", f"{len(agg.debits) + len(agg.credits):,}"],
    ]
    story.append(_table(rows, [70 * mm, 60 * mm]))

    story.extend(_statements_block(statements, styles))

    # Category breakdown
    cat_totals: dict[str, float] = defaultdict(float)
    for t in agg.debits:
        cat_totals[t.category.value] += _f(t.amount)
    cat_rows = [["Category", "Amount", "Share"]]
    grand = sum(cat_totals.values()) or 1.0
    for cat in CATEGORY_ORDER:
        v = cat_totals.get(cat.value, 0.0)
        if v == 0:
            continue
        cat_rows.append([_label(cat.value), _inr(v), f"{(v / grand) * 100:.0f}%"])
    if len(cat_rows) > 1:
        story.append(Paragraph("Where it went", styles["h2"]))
        story.append(_table(cat_rows, [60 * mm, 40 * mm, 25 * mm]))

    doc.build(story)
    return buf.getvalue()


def build_yearly_pdf(statements: list[Statement]) -> bytes:
    doc, buf = _make_doc("Yearly report")
    styles = _styles()
    story: list = [Paragraph("Yearly view", styles["h1"])]

    monthly: dict[date, float] = defaultdict(float)
    for t in _all_txns(statements):
        if t.is_debit:
            monthly[t.txn_date.replace(day=1)] += _f(t.amount)

    if not monthly:
        story.append(Paragraph("No transactions to chart.", styles["body"]))
        doc.build(story)
        return buf.getvalue()

    months = sorted(monthly.keys())
    rows = [["Month", "Spending", "Δ vs. prior"]]
    prev = None
    for m in months:
        v = monthly[m]
        delta = "—" if prev is None else (
            f"{((v - prev) / prev * 100):+.0f}%" if prev > 0 else "—"
        )
        rows.append([m.strftime("%b %Y"), _inr(v), delta])
        prev = v
    rows.append(["Total", _inr(sum(monthly.values())), ""])
    story.append(_table(rows, [40 * mm, 50 * mm, 30 * mm]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "A positive delta means you spent more than the previous month.",
        styles["muted"],
    ))
    doc.build(story)
    return buf.getvalue()


def build_categories_pdf(statements: list[Statement]) -> bytes:
    doc, buf = _make_doc("Categories report")
    styles = _styles()
    story: list = [Paragraph("Spending by category", styles["h1"])]

    cat_totals: dict[Category, float] = defaultdict(float)
    cat_counts: dict[Category, int] = defaultdict(int)
    top_merchants: dict[Category, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for t in _all_txns(statements):
        if not t.is_debit:
            continue
        cat_totals[t.category] += _f(t.amount)
        cat_counts[t.category] += 1
        m = (t.merchant_norm or t.merchant_raw or "").strip()
        if m:
            top_merchants[t.category][m] += _f(t.amount)

    grand = sum(cat_totals.values()) or 1.0
    for cat in CATEGORY_ORDER:
        v = cat_totals.get(cat, 0.0)
        if v == 0:
            continue
        story.append(Paragraph(f"{_label(cat.value)} · {_inr(v)} ({(v / grand) * 100:.0f}%)", styles["h2"]))
        story.append(Paragraph(f"{cat_counts[cat]} transactions", styles["muted"]))
        sub = sorted(top_merchants[cat].items(), key=lambda kv: kv[1], reverse=True)[:5]
        if sub:
            rows = [["Merchant", "Amount"]]
            for m, a in sub:
                rows.append([m, _inr(a)])
            story.append(_table(rows, [85 * mm, 35 * mm]))
    if not cat_totals:
        story.append(Paragraph("No debit transactions to summarise.", styles["body"]))
    doc.build(story)
    return buf.getvalue()


def build_subscriptions_pdf(statements: list[Statement]) -> bytes:
    doc, buf = _make_doc("Subscriptions report")
    styles = _styles()
    story: list = [Paragraph("Recurring subscriptions", styles["h1"])]

    # Merchant → all txns
    grouped: dict[str, list[Transaction]] = defaultdict(list)
    for t in _all_txns(statements):
        if not t.is_debit:
            continue
        m = (t.merchant_norm or t.merchant_raw or "").strip()
        if not m:
            continue
        if t.category == Category.SUBSCRIPTIONS or len({tx.txn_date.replace(day=1) for tx in grouped[m] + [t]}) >= 2:
            grouped[m].append(t)

    rows = [["Merchant", "Monthly", "Annualised", "Cycles seen"]]
    monthly_total = 0.0
    for m, txns in sorted(grouped.items(), key=lambda kv: sum(_f(t.amount) for t in kv[1]), reverse=True):
        amounts = sorted(_f(t.amount) for t in txns)
        monthly = amounts[len(amounts) // 2]
        annual = monthly * 12
        cycles = len({t.txn_date.replace(day=1) for t in txns})
        rows.append([m, _inr(monthly), _inr(annual), str(cycles)])
        monthly_total += monthly
    if len(rows) > 1:
        rows.append(["Total", _inr(monthly_total), _inr(monthly_total * 12), ""])
        story.append(_table(rows, [70 * mm, 30 * mm, 35 * mm, 25 * mm]))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Cancelling unused subscriptions is the easiest recurring win. "
            "The Resolution Assistant can draft cancellation emails per row.",
            styles["muted"],
        ))
    else:
        story.append(Paragraph(
            "No recurring subscriptions detected across the loaded statements.",
            styles["body"],
        ))
    doc.build(story)
    return buf.getvalue()


def build_tax_summary_pdf(statements: list[Statement]) -> bytes:
    doc, buf = _make_doc("Tax-friendly summary")
    styles = _styles()
    story: list = [
        Paragraph("Tax-friendly summary", styles["h1"]),
        Paragraph(
            "Items grouped to make filing easier. This is not tax advice — "
            "review with your CA before claiming anything.",
            styles["muted"],
        ),
        Spacer(1, 6),
    ]

    # Per-category totals for the categories that typically have tax relevance.
    relevant: dict[Category, float] = defaultdict(float)
    for t in _all_txns(statements):
        if t.is_debit and t.category in {
            Category.INSURANCE, Category.INVESTMENT, Category.HEALTHCARE,
            Category.UTILITIES, Category.TELECOM,
        }:
            relevant[t.category] += _f(t.amount)
    gst = sum(_f(s.meta.gst_on_charges) for s in statements)

    rows = [["Item", "Amount", "Why it's listed"]]
    rows.append(["Insurance", _inr(relevant.get(Category.INSURANCE, 0.0)),
                 "May qualify under Sec 80C / 80D depending on policy."])
    rows.append(["Investment", _inr(relevant.get(Category.INVESTMENT, 0.0)),
                 "ELSS / NPS contributions can be relevant under 80C / 80CCD."])
    rows.append(["Healthcare", _inr(relevant.get(Category.HEALTHCARE, 0.0)),
                 "Diagnostic + preventive spend may be claimable under 80D."])
    rows.append(["Utilities (work-from-home)", _inr(relevant.get(Category.UTILITIES, 0.0)),
                 "Useful if you claim WFH reimbursements from your employer."])
    rows.append(["Telecom (work-from-home)", _inr(relevant.get(Category.TELECOM, 0.0)),
                 "Useful if you claim WFH reimbursements from your employer."])
    rows.append(["GST paid on card charges", _inr(gst),
                 "Reported separately on each statement; not directly claimable."])
    story.append(_table(rows, [44 * mm, 26 * mm, 100 * mm]))
    doc.build(story)
    return buf.getvalue()


# ---------- dispatcher ----------

REPORTS: dict[str, Callable[[list[Statement]], bytes]] = {
    "summary": build_summary_pdf,
    "yearly": build_yearly_pdf,
    "categories": build_categories_pdf,
    "subscriptions": build_subscriptions_pdf,
    "tax-summary": build_tax_summary_pdf,
}
