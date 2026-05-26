"use client";

/**
 * Stage 7 — Spending Intelligence cards, Suspicious Activity panel,
 * and Spending Profile tags.
 *
 * Each insight card surfaces: title · body · next-step.
 * A beginner-mode toggle swaps body for the simpler `beginner_body` copy.
 */

import * as React from "react";
import {
  ShieldAlert,
  Sparkles,
  Award,
  CalendarDays,
  Receipt,
  ShoppingBag,
  AlertTriangle,
  Repeat,
  CreditCard,
  Globe2,
  TrendingUp,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { inr } from "@/lib/format";
import type { InsightCard, ProfileTag } from "@/lib/api";

const CATEGORY_ICONS: Record<InsightCard["category"], LucideIcon> = {
  charges: AlertTriangle,
  recurring: Repeat,
  utilization: CreditCard,
  anomaly: ShieldAlert,
  duplicate: ShieldAlert,
  forex: Globe2,
  profile_hint: TrendingUp,
};

const PROFILE_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Award,
  CalendarDays,
  Receipt,
  ShoppingBag,
  TrendingUp,
  CircleDollarSign,
};

/* --------- Insight card --------- */

function severityClasses(sev: 1 | 2 | 3): string {
  if (sev === 3) return "bg-paper-warm text-ink";
  if (sev === 2) return "bg-accent-mist text-accent-ink";
  return "bg-accent-soft text-accent-ink";
}

function severityLabel(sev: 1 | 2 | 3): string {
  return sev === 3 ? "urgent" : sev === 2 ? "watch" : "nudge";
}

export function InsightCardView({
  card,
  beginner,
}: {
  card: InsightCard;
  beginner: boolean;
}) {
  const Icon = CATEGORY_ICONS[card.category] ?? AlertTriangle;
  const body = beginner ? card.beginner_body : card.body;
  return (
    <Card elevation="md" className="p-6 md:p-7 flex flex-col">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-mist text-accent-ink shrink-0">
          <Icon size={16} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[11px] uppercase tracking-eyebrow px-2 py-0.5 rounded-full ${severityClasses(
                card.severity
              )}`}
            >
              {severityLabel(card.severity)}
            </span>
            {card.impact_inr >= 100 ? (
              <span className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                impact · {inr(card.impact_inr)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 font-display text-lg text-ink leading-tight">
            {card.title}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[15px] text-ink-soft">{body}</p>
      {card.next_step ? (
        <p className="mt-4 pt-4 border-t border-ink/6 text-[13px] text-ink">
          <span className="text-[11px] uppercase tracking-eyebrow text-ink-muted mr-2">
            What to do
          </span>
          {card.next_step}
        </p>
      ) : null}
    </Card>
  );
}

/* --------- Insights grid --------- */

export function InsightsGrid({
  data,
  beginner,
}: {
  data: InsightCard[];
  beginner: boolean;
}) {
  if (!data.length) {
    return (
      <Card elevation="md" className="p-6 md:p-7">
        <p className="text-ink-muted text-sm">
          Once we have enough data, your top insights will appear here.
        </p>
      </Card>
    );
  }
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {data.map((c, i) => (
        <InsightCardView key={`${c.id}-${i}`} card={c} beginner={beginner} />
      ))}
    </div>
  );
}

/* --------- Suspicious Activity panel --------- */

export function SuspiciousPanel({
  data,
  beginner,
}: {
  data: InsightCard[];
  beginner: boolean;
}) {
  if (!data.length) {
    return (
      <Card elevation="md" className="p-6 md:p-7">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent-ink shrink-0">
            <ShieldAlert size={16} strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
              Suspicious activity
            </p>
            <p className="mt-0.5 font-display text-xl text-ink leading-tight">
              Nothing flagged.
            </p>
            <p className="mt-2 text-ink-soft text-[15px]">
              No duplicate charges or unusually large outliers spotted in the
              loaded statements.
            </p>
          </div>
        </div>
      </Card>
    );
  }
  return (
    <Card elevation="md" tone="mist" className="p-6 md:p-7">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper-card text-accent-ink shrink-0">
          <ShieldAlert size={16} strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            Suspicious activity
          </p>
          <p className="mt-0.5 font-display text-xl text-ink leading-tight">
            {data.length} thing{data.length === 1 ? "" : "s"} worth checking
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {data.map((c, i) => (
          <li key={`${c.id}-${i}`} className="p-4 rounded-2xl bg-paper-card">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="font-display text-[16px] text-ink">{c.title}</p>
              {c.impact_inr >= 100 ? (
                <span className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                  {inr(c.impact_inr)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[14px] text-ink-soft">
              {beginner ? c.beginner_body : c.body}
            </p>
            {c.next_step ? (
              <p className="mt-2 text-[13px] text-ink">
                <span className="text-[11px] uppercase tracking-eyebrow text-ink-muted mr-2">
                  Next step
                </span>
                {c.next_step}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* --------- Spending Profile tags --------- */

export function SpendingProfile({ data }: { data: ProfileTag[] }) {
  if (!data.length) {
    return (
      <Card elevation="md" className="p-6 md:p-7">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
          Spending profile
        </p>
        <p className="mt-2 font-display text-xl text-ink leading-tight">
          Still warming up.
        </p>
        <p className="mt-2 text-ink-soft text-[15px]">
          A clearer profile shows up once we have a couple of cycles to compare.
        </p>
      </Card>
    );
  }
  return (
    <Card elevation="md" className="p-6 md:p-7">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
        Spending profile
      </p>
      <p className="mt-2 font-display text-xl text-ink leading-tight">
        You look like a {data[0].title}
        {data.length > 1 ? " (and a few others)" : ""}.
      </p>
      <ul className="mt-4 space-y-3">
        {data.map((t) => {
          const Icon = PROFILE_ICONS[t.icon] ?? Sparkles;
          return (
            <li key={t.id} className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-mist text-accent-ink shrink-0">
                <Icon size={14} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[16px] text-ink">{t.title}</p>
                <p className="text-[13px] text-ink-soft">{t.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* --------- Beginner mode toggle --------- */

export function BeginnerToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className="inline-flex items-center gap-2 text-[12px] uppercase tracking-eyebrow text-ink-muted hover:text-ink transition-colors"
    >
      <span
        className={`inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
          value ? "bg-accent" : "bg-ink/15"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-paper-card shadow-card-sm transition-transform ${
            value ? "translate-x-4" : ""
          }`}
        />
      </span>
      Beginner mode
    </button>
  );
}
