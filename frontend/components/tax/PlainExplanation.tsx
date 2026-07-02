"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { explainTax } from "@/lib/tax/explain";
import type { TaxToolkitInput, TaxToolkitResult } from "@/lib/tax/analyze";

export function PlainExplanation({
  input,
  result,
}: {
  input: TaxToolkitInput;
  result: TaxToolkitResult;
}) {
  const e = explainTax(input, result);

  return (
    <Card elevation="lg" className="p-6 md:p-8">
      <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-ink-muted">
        <Sparkles size={12} /> In plain English
      </p>

      {/* The one line that matters */}
      <p
        className={`mt-4 font-display text-2xl md:text-3xl leading-snug ${
          e.owe ? "text-ink" : "text-ink"
        }`}
      >
        {e.bottomLine}
      </p>

      {/* How we got there */}
      <div className="mt-7 space-y-0 divide-y divide-ink/8 border-t border-ink/8">
        {e.story.map((s, i) => (
          <div key={i} className="flex items-baseline gap-4 py-3">
            <span className="w-36 shrink-0 text-[13px] uppercase tracking-wide text-ink-muted">
              {s.label}
            </span>
            <span
              className={`text-[15px] md:text-base leading-relaxed ${
                s.tone === "bad"
                  ? "text-red-700"
                  : s.tone === "good"
                  ? "text-emerald-700"
                  : "text-ink"
              }`}
            >
              {s.plain}
            </span>
          </div>
        ))}
      </div>

      {/* Which regime */}
      <div className="mt-7 rounded-2xl bg-accent-mist p-5">
        <p className="font-display text-lg md:text-xl text-ink">{e.verdict}</p>
        <p className="mt-1.5 text-[15px] text-ink-soft leading-relaxed">
          {e.verdictReason}
        </p>
      </div>

      {/* Context note */}
      <p className="mt-5 text-[15px] text-ink-soft leading-relaxed">{e.note}</p>

      {/* What to do next */}
      <div className="mt-7">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          What to do next
        </p>
        <ol className="mt-3 space-y-2.5">
          {e.nextSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-warm text-[12px] font-medium text-ink">
                {i + 1}
              </span>
              <span className="text-[15px] md:text-base text-ink leading-relaxed">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-ink-muted">
        <ArrowRight size={12} /> Estimate for FY 2025-26, individuals below 60.
        Not tax advice — verify on incometax.gov.in or with a CA.
      </p>
    </Card>
  );
}
