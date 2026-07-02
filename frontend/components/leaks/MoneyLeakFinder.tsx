"use client";

/**
 * Money Leak Finder — the sharp, unique core of LabhPay.
 *
 * Instead of a generic dashboard, it answers one question: "where is my money
 * leaking, and what do I do about it?" One headline number, a short scannable
 * list of leaks, one action each. Calm, readable, Zara-clean. All derived from
 * the existing dashboard summary + intelligence — no new backend.
 */

import * as React from "react";
import { Flame, Receipt, Repeat, Copy, CheckCircle2, ArrowRight } from "lucide-react";
import { inr, fmtDate } from "@/lib/format";
import { openAssistant } from "@/components/dashboard/Overview";
import type { DashSummary, IntelligenceSummary } from "@/lib/api";

type Leak = {
  id: string;
  icon: typeof Flame;
  title: string;
  amount: number;
  unit?: string; // e.g. "/mo"
  caption: string;
  action: string;
  ask: string; // assistant prefill
};

function computeLeaks(summary: DashSummary, intel: IntelligenceSummary | null) {
  const hc = summary.hidden_charges;
  const stmt = summary.statements[0];
  const due = stmt?.due_date ?? null;
  const outstanding = stmt?.total_outstanding ?? 0;
  const leaks: Leak[] = [];

  if (hc.finance > 0) {
    leaks.push({
      id: "interest",
      icon: Flame,
      title: "Interest on your balance",
      amount: hc.finance + hc.gst,
      caption: "You were charged interest (and GST on it) for carrying a balance forward.",
      action:
        outstanding > 0 && due
          ? `Pay the full ${inr(outstanding)} by ${fmtDate(due)} to stop this next cycle.`
          : "Pay your statement in full each month to avoid this entirely.",
      ask: "How do I stop paying interest on my credit card?",
    });
  }

  const penalties = hc.late_fees + hc.overlimit;
  if (penalties > 0) {
    leaks.push({
      id: "penalties",
      icon: Receipt,
      title: "Late & over-limit fees",
      amount: penalties,
      caption: "Penalty fees that are fully avoidable — and often reversible on request.",
      action: "Set up autopay for the minimum due, and ask the bank for a one-time waiver.",
      ask: "How can I get a late fee reversed on my credit card?",
    });
  }

  if (summary.recurring.length) {
    const monthly = summary.recurring.reduce((a, r) => a + r.monthly_amount, 0);
    leaks.push({
      id: "subs",
      icon: Repeat,
      title: `${summary.recurring.length} recurring ${summary.recurring.length === 1 ? "charge" : "charges"}`,
      amount: monthly,
      unit: "/mo",
      caption: `That's ${inr(monthly * 12)} a year on autopilot. Cancel the ones you don't use.`,
      action: "Review the list below and cancel anything you've forgotten about.",
      ask: "Which of my subscriptions should I consider cancelling?",
    });
  }

  const dupes = (intel?.suspicious ?? []).filter((c) => c.category === "duplicate");
  if (dupes.length) {
    const amt = dupes.reduce((a, d) => a + (d.impact_inr || 0), 0);
    leaks.push({
      id: "dupes",
      icon: Copy,
      title: `Possible duplicate ${dupes.length === 1 ? "charge" : "charges"}`,
      amount: amt,
      caption: "The same amount hit the same merchant twice — worth checking and disputing.",
      action: "Open the assistant to draft a dispute with the details pre-filled.",
      ask: "Help me dispute a duplicate charge on my statement.",
    });
  }

  // Headline = money lost to charges this cycle (the clearly avoidable part).
  const headline = hc.total;
  return { leaks, headline, allClear: leaks.length === 0 };
}

export function MoneyLeakFinder({
  summary,
  intel,
  onSeeDetails,
}: {
  summary: DashSummary;
  intel: IntelligenceSummary | null;
  onSeeDetails?: () => void;
}) {
  const { leaks, headline, allClear } = computeLeaks(summary, intel);
  const bank = summary.statements[0]?.bank_display;

  if (allClear) {
    return (
      <section className="py-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          Money leaks{bank ? ` · ${bank}` : ""}
        </p>
        <div className="mt-6 flex items-start gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-mist text-accent-ink shrink-0">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <h1 className="font-display text-4xl md:text-5xl text-ink leading-[1.05]">
              No leaks this cycle.
            </h1>
            <p className="mt-3 text-lg text-ink-soft max-w-xl">
              We checked every line — no interest, no penalty fees, no duplicate
              charges. You&rsquo;re running a tight ship.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
        Money leaks{bank ? ` · ${bank}` : ""}
      </p>

      {/* The one number */}
      <h1 className="mt-5 font-display text-ink leading-[0.95]">
        <span className="block text-6xl md:text-7xl tabular-nums">{inr(headline)}</span>
        <span className="mt-3 block text-2xl md:text-3xl text-ink-soft font-normal">
          {headline > 0 ? "leaked to avoidable charges this cycle." : "in recurring costs worth a look."}
        </span>
      </h1>

      {/* Leak list — scannable, one action each */}
      <ul className="mt-12 divide-y divide-ink/10 border-t border-ink/10">
        {leaks.map((l) => {
          const Icon = l.icon;
          return (
            <li key={l.id} className="py-7">
              <div className="flex items-start gap-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-paper-warm text-ink shrink-0">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="font-display text-xl md:text-2xl text-ink">{l.title}</h2>
                    <span className="font-display text-2xl md:text-3xl text-ink tabular-nums shrink-0">
                      {inr(l.amount)}
                      {l.unit ? <span className="text-base text-ink-muted">{l.unit}</span> : null}
                    </span>
                  </div>
                  <p className="mt-2 text-[15px] md:text-base text-ink-soft leading-relaxed max-w-2xl">
                    {l.caption}
                  </p>
                  <p className="mt-3 text-[15px] text-ink max-w-2xl">
                    <span className="text-ink-muted">What to do — </span>
                    {l.action}
                  </p>
                  <button
                    type="button"
                    onClick={() => openAssistant(l.ask)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline underline-offset-4"
                  >
                    Ask the assistant <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {onSeeDetails ? (
        <button
          type="button"
          onClick={onSeeDetails}
          className="mt-10 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
        >
          See the full breakdown <ArrowRight size={14} />
        </button>
      ) : null}
    </section>
  );
}
