"use client";

/**
 * The "decision layer" of the dashboard — what a financial advisor would put
 * in front of you first:
 *   1. FinancialSnapshot — what you owe, by when, and the single smartest move.
 *   2. PriorityActions   — the few things that actually need attention now.
 * Everything else lives behind progressive-disclosure sections.
 */

import * as React from "react";
import {
  AlertTriangle,
  Repeat,
  CreditCard,
  ShieldAlert,
  Globe2,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inr, fmtDate } from "@/lib/format";
import type { DashSummary, InsightCard } from "@/lib/api";

/** Open the assistant drawer (optionally pre-filling a question). */
export function openAssistant(question?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("labhpay:assistant", { detail: { question } })
  );
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return null;
  const ms = due - Date.now();
  return Math.ceil(ms / 86_400_000);
}

/* ----------------- Financial snapshot (hero) ----------------- */

export function FinancialSnapshot({ summary }: { summary: DashSummary }) {
  const stmt = summary.statements[0];
  const amountDue = stmt?.total_outstanding ?? 0;
  const minDue = stmt?.minimum_due ?? 0;
  const due = stmt?.due_date ?? null;
  const left = daysUntil(due);
  const avoidable = summary.hidden_charges?.total ?? 0;
  const util = summary.utilization;

  const hasBill = amountDue > 0 && !!due;

  // The one-line advisor verdict.
  let verdict: string;
  let verdictTone: "good" | "warn";
  if (avoidable > 0) {
    verdict = `Pay the full ${inr(amountDue)} by the due date to avoid ${inr(
      avoidable
    )} in interest & charges next cycle.`;
    verdictTone = "warn";
  } else if (hasBill) {
    verdict = `You're interest-free this cycle. Just clear the bill by the due date.`;
    verdictTone = "good";
  } else {
    verdict = `No outstanding bill detected on the loaded statement.`;
    verdictTone = "good";
  }

  const urgent = left !== null && left <= 5;

  return (
    <Card elevation="lg" className="p-6 md:p-8">
      <div className="grid lg:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Headline */}
        <div className="lg:col-span-5">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            {hasBill ? "Total amount due" : "Spent this cycle"}
          </p>
          <p className="mt-2 font-display text-5xl md:text-6xl text-ink leading-none">
            {inr(hasBill ? amountDue : summary.total_spending)}
          </p>
          {hasBill ? (
            <p className="mt-3 text-[15px] text-ink-soft">
              Due {fmtDate(due)}
              {left !== null ? (
                <span className={urgent ? "text-red-600 font-medium" : ""}>
                  {" · "}
                  {left < 0
                    ? `${Math.abs(left)} days overdue`
                    : left === 0
                    ? "due today"
                    : `${left} days left`}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-3 text-[15px] text-ink-soft">
              {summary.txn_count.toLocaleString("en-IN")} transactions
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                openAssistant(
                  hasBill
                    ? "How can I lower my next bill?"
                    : "Summarise my spending this cycle."
                )
              }
            >
              <Sparkles size={14} className="mr-1.5" />
              Ask the assistant
            </Button>
          </div>
        </div>

        {/* Advisor verdict + KPIs */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={`rounded-2xl p-4 md:p-5 flex items-start gap-3 ${
              verdictTone === "warn" ? "bg-amber-50" : "bg-accent-mist"
            }`}
          >
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                verdictTone === "warn"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-paper-card text-accent-ink"
              }`}
            >
              {verdictTone === "warn" ? (
                <AlertTriangle size={15} />
              ) : (
                <CheckCircle2 size={15} />
              )}
            </span>
            <p className="text-[15px] text-ink leading-relaxed">{verdict}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Kpi
              label="Minimum due"
              value={minDue > 0 ? inr(minDue) : "—"}
            />
            <Kpi
              label="Utilization"
              value={util ? `${Math.round(util.pct * 100)}%` : "—"}
              tone={
                util?.tone === "high"
                  ? "bad"
                  : util?.tone === "medium"
                  ? "warn"
                  : util
                  ? "good"
                  : undefined
              }
            />
            <Kpi
              label="Hidden charges"
              value={avoidable > 0 ? inr(avoidable) : "None"}
              tone={avoidable > 0 ? "bad" : "good"}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad";
}) {
  const valueClr =
    tone === "bad"
      ? "text-red-600"
      : tone === "warn"
      ? "text-amber-600"
      : "text-ink";
  return (
    <div className="rounded-2xl bg-paper-warm/60 p-3.5">
      <p className="text-[10px] uppercase tracking-eyebrow text-ink-muted">
        {label}
      </p>
      <p className={`mt-1 font-display text-xl tabular-nums ${valueClr}`}>
        {value}
      </p>
    </div>
  );
}

/* ----------------- Priority actions ----------------- */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  charges: AlertTriangle,
  recurring: Repeat,
  utilization: CreditCard,
  anomaly: ShieldAlert,
  duplicate: ShieldAlert,
  forex: Globe2,
  profile_hint: TrendingUp,
};

function sevLabel(s: 1 | 2 | 3) {
  return s === 3 ? "Urgent" : s === 2 ? "Worth a look" : "Tip";
}
function sevDot(s: 1 | 2 | 3) {
  return s === 3 ? "bg-red-500" : s === 2 ? "bg-amber-500" : "bg-accent";
}

export function PriorityActions({
  cards,
  beginner,
}: {
  cards: InsightCard[];
  beginner: boolean;
}) {
  if (!cards.length) {
    return (
      <Card elevation="md" className="p-6 md:p-7">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-mist text-accent-ink shrink-0">
            <CheckCircle2 size={16} />
          </span>
          <div>
            <p className="font-display text-xl text-ink leading-tight">
              You&rsquo;re all clear.
            </p>
            <p className="mt-1 text-ink-soft text-[15px]">
              Nothing needs your attention on this statement. Explore the
              sections below whenever you&rsquo;re curious.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {cards.map((c, i) => {
        const Icon = CATEGORY_ICONS[c.category] ?? AlertTriangle;
        const body = beginner ? c.beginner_body : c.body;
        return (
          <Card
            key={`${c.id}-${i}`}
            elevation="md"
            className="p-5 md:p-6 flex items-start gap-4"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-mist text-accent-ink shrink-0">
              <Icon size={17} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-eyebrow text-ink-soft">
                  <span className={`h-1.5 w-1.5 rounded-full ${sevDot(c.severity)}`} />
                  {sevLabel(c.severity)}
                </span>
                {c.impact_inr >= 100 ? (
                  <span className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                    · saves up to {inr(c.impact_inr)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 font-display text-lg text-ink leading-tight">
                {c.title}
              </p>
              <p className="mt-1.5 text-[15px] text-ink-soft">{body}</p>
              {c.next_step ? (
                <button
                  type="button"
                  onClick={() => openAssistant(`${c.title} — what should I do?`)}
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-ink hover:underline underline-offset-4"
                >
                  {c.next_step}
                  <ArrowRight size={13} />
                </button>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/** Merge insights + suspicious, de-dupe, rank by severity then impact. */
export function rankActions(
  insights: InsightCard[],
  suspicious: InsightCard[]
): InsightCard[] {
  const seen = new Set<string>();
  const all: InsightCard[] = [];
  for (const c of [...suspicious, ...insights]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    all.push(c);
  }
  return all.sort(
    (a, b) => b.severity - a.severity || b.impact_inr - a.impact_inr
  );
}
