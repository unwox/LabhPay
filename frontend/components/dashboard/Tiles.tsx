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
    <Card elevation="lg" className="p-8 md:p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-mist text-accent-ink mx-auto">
        <TrendingUp size={20} />
      </span>
      <h2 className="mt-5 font-display text-display-sm text-ink">
        Upload your first statement.
      </h2>
      <p className="mt-3 text-ink-soft max-w-prose mx-auto">
        Once we read your PDF, this page becomes your calm view of every rupee
        — category breakdown, recurring subscriptions, hidden charges,
        utilization and more.
      </p>
      {onUpload ? (
        <button
          type="button"
          onClick={onUpload}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline underline-offset-4"
        >
          Upload a statement <ChevronRight size={14} />
        </button>
      ) : (
        <Link
          href="/upload"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline underline-offset-4"
        >
          Go to upload <ChevronRight size={14} />
        </Link>
      )}
    </Card>
  );
}
