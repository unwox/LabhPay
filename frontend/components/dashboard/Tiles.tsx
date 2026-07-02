"use client";

import * as React from "react";
import Link from "next/link";
import {
  Receipt,
  AlertTriangle,
  Repeat,
  CreditCard,
  TrendingUp,
  ChevronRight,
  FileSearch,
  Calculator,
  BookOpen,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { inr, pct, titleCase, fmtDate } from "@/lib/format";
import type { DashSummary } from "@/lib/api";

/* ----------------- Top headline tile ----------------- */

export function HeadlineTile({
  total,
  txnCount,
  confidence,
}: {
  total: number;
  txnCount: number;
  confidence: DashSummary["confidence"];
}) {
  return (
    <Card elevation="lg" className="p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            Total spending across statements
          </p>
          <p className="mt-2 font-display text-5xl md:text-6xl text-ink leading-none">
            {inr(total)}
          </p>
          <p className="mt-3 text-ink-soft text-sm">
            {txnCount.toLocaleString("en-IN")} transactions
          </p>
        </div>
        <ConfidenceBadge level={confidence.extraction} label="Extraction" />
      </div>
    </Card>
  );
}

function ConfidenceBadge({
  level,
  label,
}: {
  level: "high" | "medium" | "low" | "none";
  label: string;
}) {
  if (level === "none" || level === "high") return null;
  const cls =
    level === "low"
      ? "bg-paper-warm text-ink"
      : "bg-accent-mist text-accent-ink";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-eyebrow px-2.5 py-1.5 rounded-full ${cls}`}>
      {label}: {level}
    </span>
  );
}

/* ----------------- Top merchants ----------------- */

export function TopMerchants({
  data,
}: {
  data: DashSummary["top_merchants"];
}) {
  if (!data.length) {
    return (
      <p className="text-ink-muted text-sm">
        Once we extract transactions, your top merchants land here.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-ink/6">
      {data.map((m) => (
        <li key={m.merchant} className="py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-ink truncate">{m.merchant}</p>
            <p className="text-xs text-ink-muted">
              {titleCase(m.category)} · {m.count} txn{m.count === 1 ? "" : "s"}
            </p>
          </div>
          <p className="font-display text-lg text-ink tabular-nums">{inr(m.amount)}</p>
        </li>
      ))}
    </ul>
  );
}

/* ----------------- Hidden charges ----------------- */

export function HiddenChargesCard({
  data,
}: {
  data: DashSummary["hidden_charges"];
}) {
  if (!data.has_any) {
    return (
      <Card elevation="md" className="p-6 md:p-7">
        <Header icon={AlertTriangle} eyebrow="Hidden charges" title="None to flag." />
        <p className="mt-2 text-ink-soft">
          Nice — no finance charges, late fees or GST surprises on this cycle.
        </p>
      </Card>
    );
  }
  return (
    <Card elevation="md" tone="mist" className="p-6 md:p-7">
      <Header
        icon={AlertTriangle}
        eyebrow="Hidden charges"
        title={`${inr(data.total)} this cycle`}
      />
      <ul className="mt-3 space-y-2 text-[15px]">
        {data.finance > 0 ? (
          <Row label="Finance / interest" value={inr(data.finance)} />
        ) : null}
        {data.gst > 0 ? <Row label="GST on charges" value={inr(data.gst)} /> : null}
        {data.late_fees > 0 ? <Row label="Late fees" value={inr(data.late_fees)} /> : null}
        {data.overlimit > 0 ? <Row label="Over-limit fees" value={inr(data.overlimit)} /> : null}
      </ul>
      <p className="mt-3 text-xs text-ink-muted">
        Paying the total outstanding in full next month removes most of this.
      </p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between text-ink">
      <span className="text-ink-soft">{label}</span>
      <span className="font-display text-lg tabular-nums">{value}</span>
    </li>
  );
}

/* ----------------- Subscriptions ----------------- */

export function SubscriptionsCard({
  data,
}: {
  data: DashSummary["recurring"];
}) {
  const monthly = data.reduce((a, r) => a + r.monthly_amount, 0);
  return (
    <Card elevation="md" className="p-6 md:p-7">
      <Header
        icon={Repeat}
        eyebrow="Subscriptions"
        title={
          data.length
            ? `${data.length} recurring · ${inr(monthly)}/mo`
            : "No subscriptions detected"
        }
      />
      {data.length === 0 ? (
        <p className="mt-2 text-ink-soft">
          Recurring charges will appear here once we spot them across statements.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-[15px]">
          {data.slice(0, 5).map((r) => (
            <li
              key={r.merchant}
              className="flex items-center justify-between gap-3 text-ink"
            >
              <div className="min-w-0">
                <p className="truncate">{r.merchant}</p>
                <p className="text-xs text-ink-muted">{titleCase(r.category)}</p>
              </div>
              <p className="font-display tabular-nums">{inr(r.monthly_amount)}</p>
            </li>
          ))}
          {data.length > 5 ? (
            <li className="text-xs text-ink-muted pt-1">
              + {data.length - 5} more
            </li>
          ) : null}
        </ul>
      )}
    </Card>
  );
}

/* ----------------- EMI burden ----------------- */

export function EmiCard({ data }: { data: DashSummary["emi"] }) {
  return (
    <Card elevation="md" className="p-6 md:p-7">
      <Header
        icon={Receipt}
        eyebrow="EMI burden"
        title={
          data.count ? `${inr(data.total)} across ${data.count}` : "No EMIs detected"
        }
      />
      <p className="mt-2 text-ink-soft text-[15px]">
        {data.count
          ? "Active EMI conversions on this cycle. We'll flag any that look unexpectedly high."
          : "No equated instalment charges spotted on the loaded statements."}
      </p>
    </Card>
  );
}

/* ----------------- Utilization ----------------- */

export function UtilizationCard({
  data,
}: {
  data: DashSummary["utilization"];
}) {
  if (!data) {
    return (
      <Card elevation="md" className="p-6 md:p-7">
        <Header
          icon={CreditCard}
          eyebrow="Utilization"
          title="Limit not detected"
        />
        <p className="mt-2 text-ink-soft text-[15px]">
          We need at least one statement that shows your credit limit to
          estimate utilization.
        </p>
      </Card>
    );
  }
  const tone =
    data.tone === "high"
      ? "bg-paper-warm text-ink"
      : data.tone === "medium"
      ? "bg-accent-mist text-accent-ink"
      : "bg-accent-soft text-accent-ink";

  return (
    <Card elevation="md" className="p-6 md:p-7">
      <Header
        icon={CreditCard}
        eyebrow="Utilization"
        title={`${pct(data.pct)} used`}
      />
      <div className="mt-4 h-2 rounded-full bg-paper-warm overflow-hidden">
        <div
          className="h-full bg-accent"
          style={{ width: `${Math.min(100, Math.max(0, data.pct * 100))}%` }}
        />
      </div>
      <p className="mt-3 text-[13px] text-ink-soft">
        {inr(data.used)} of {inr(data.limit)} · {" "}
        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] uppercase tracking-eyebrow ${tone}`}>
          {data.tone}
        </span>
      </p>
      <p className="mt-2 text-xs text-ink-muted">
        Keeping utilization under 30% is best for your credit score.
      </p>
    </Card>
  );
}

/* ----------------- Statements list ----------------- */

export function StatementsList({
  data,
}: {
  data: DashSummary["statements"];
}) {
  if (!data.length) {
    return (
      <p className="text-ink-muted text-sm">No statements loaded yet.</p>
    );
  }
  return (
    <ul className="divide-y divide-ink/6">
      {data.map((s, i) => (
        <li key={i} className="py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ink truncate">
              {s.bank_display}
              {s.card_last4 ? <span className="text-ink-muted"> · •••• {s.card_last4}</span> : null}
            </p>
            <p className="text-xs text-ink-muted">
              {s.txn_count} txns · Due {fmtDate(s.due_date)}
            </p>
          </div>
          <p className="font-display text-lg text-ink tabular-nums">
            {inr(s.total_outstanding)}
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ----------------- shared header ----------------- */

function Header({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: React.ComponentType<any>;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-mist text-accent-ink shrink-0">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
          {eyebrow}
        </p>
        <p className="mt-0.5 font-display text-xl text-ink leading-tight">
          {title}
        </p>
      </div>
    </div>
  );
}

/* ----------------- empty state ----------------- */

export function EmptyState({ onUpload }: { onUpload?: () => void }) {
  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          Welcome to LabhPay
        </p>
        <h2 className="mt-3 font-display text-display-sm md:text-4xl text-ink">
          What would you like to do?
        </h2>
        <p className="mt-3 text-ink-soft text-lg">
          Your private money co-pilot for India. Pick where to start — everything
          here is processed securely and auto-deleted after your session.
        </p>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-4 md:gap-5">
        <HubCard
          icon={FileSearch}
          badge="Find money leaks"
          title="Analyze a statement"
          body="Upload a credit card or bank statement to spot interest, hidden fees, forgotten subscriptions and where your money went."
          onClick={onUpload}
          href="/dashboard?upload=1"
          cta="Upload a statement"
        />
        <HubCard
          icon={Receipt}
          badge="Form 16 & taxes"
          title="Tax Toolkit"
          body="Upload your Form 16, payslip and 26AS. Compare old vs new regime, estimate your refund, and get an ITR-ready summary."
          href="/tax"
          cta="Open Tax Toolkit"
        />
        <HubCard
          icon={Calculator}
          badge="Free tools"
          title="Calculators"
          body="Income tax (old vs new), home & car loan EMI, mutual fund SIP returns, and HRA exemption — instant, no sign-up."
          href="/calculators"
          cta="Open calculators"
        />
        <HubCard
          icon={BookOpen}
          badge="Guides"
          title="Money & card guides"
          body="How to read your bank statement, understand charges, choose the right regime, and make sense of your finances."
          href="/blog"
          cta="Read the guides"
        />
      </div>
    </div>
  );
}

function HubCard({
  icon: Icon,
  badge,
  title,
  body,
  href,
  onClick,
  cta,
}: {
  icon: LucideIcon;
  badge: string;
  title: string;
  body: string;
  href: string;
  onClick?: () => void;
  cta: string;
}) {
  const inner = (
    <div className="h-full rounded-3xl bg-paper-card shadow-card-sm p-6 md:p-7 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-card-xl">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-mist text-accent-ink">
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <span className="text-[10px] uppercase tracking-eyebrow text-ink-muted">
          {badge}
        </span>
      </div>
      <p className="mt-4 font-display text-xl text-ink">{title}</p>
      <p className="mt-1.5 text-[15px] text-ink-soft leading-relaxed flex-1">{body}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink">
        {cta} <ArrowRight size={14} />
      </span>
    </div>
  );
  // The statement card opens the in-place upload modal; the rest navigate.
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-left">
        {inner}
      </button>
    );
  }
  return <Link href={href}>{inner}</Link>;
}
