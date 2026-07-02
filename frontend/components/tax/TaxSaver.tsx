"use client";

import * as React from "react";
import Link from "next/link";
import {
  PiggyBank,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Landmark,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, Slider, inr } from "@/components/calculators/ui";
import { CountUp } from "@/components/ui/count-up";
import { useAuth } from "@/lib/auth-context";
import { MultiDocUpload } from "@/components/tax/MultiDocUpload";
import { PlainExplanation } from "@/components/tax/PlainExplanation";
import { planSavings, type SaverInput } from "@/lib/tax/savings";
import { analyzeTax, type TaxToolkitInput } from "@/lib/tax/analyze";

const DEFAULTS: SaverInput = {
  gross: 1200000,
  salaried: true,
  ded80c: 50000,
  ded80d: 0,
  nps1b: 0,
  npsEmployer2: 0,
  hraExempt: 0,
  ltaExempt: 0,
  otherDeductions: 0,
  otherIncome: 0,
  tds: 0,
};

const INCOME_CHIPS = [800000, 1200000, 1800000, 2500000];

export function TaxSaver() {
  const { user } = useAuth();
  const [v, setV] = React.useState<SaverInput>(DEFAULTS);
  const set = (k: keyof SaverInput, val: number | boolean) =>
    setV((s) => ({ ...s, [k]: val as never }));

  const plan = planSavings(v);

  // For the plain-English breakdown (reuses the existing explainer).
  const toolkitInput: TaxToolkitInput = {
    grossSalary: v.gross,
    otherIncome: v.otherIncome,
    salaried: v.salaried,
    tdsPaid: v.tds,
    ded80c: v.ded80c,
    ded80d: v.ded80d,
    hraExempt: v.hraExempt,
    ltaExempt: v.ltaExempt,
    homeLoanInterest: 0,
    nps80ccd1b: v.nps1b,
    npsEmployer80ccd2: v.npsEmployer2,
    otherDeductions: v.otherDeductions,
    capitalGains: 0,
  };
  const analysis = analyzeTax(toolkitInput);

  return (
    <div className="space-y-6">
      {/* Optional auto-fill from documents */}
      <MultiDocUpload
        loggedIn={!!user}
        onMerged={(f) =>
          setV((s) => ({
            ...s,
            gross: f.gross_salary || s.gross,
            otherIncome: f.other_income || s.otherIncome,
            ded80c: f.ded_80c || s.ded80c,
            ded80d: f.ded_80d || s.ded80d,
            nps1b: f.nps_80ccd1b || s.nps1b,
            npsEmployer2: f.nps_employer_80ccd2 || s.npsEmployer2,
            hraExempt: f.hra_exempt || s.hraExempt,
            ltaExempt: f.lta_exempt || s.ltaExempt,
            tds: f.tds || s.tds,
          }))
        }
      />

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Guided inputs */}
        <Card elevation="md" className="p-6 md:p-7 space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-2">
              About you · 30 seconds
            </p>
            <Field
              label="Your yearly income (before tax)"
              value={v.gross}
              onChange={(x) => set("gross", x)}
              prefix="₹"
              step={50000}
            />
            <Slider value={v.gross} onChange={(x) => set("gross", x)} min={300000} max={10000000} step={50000} />
            <div className="mt-2 flex flex-wrap gap-2">
              {INCOME_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("gross", c)}
                  className={`rounded-full px-3 py-1 text-[13px] border transition-colors ${
                    v.gross === c
                      ? "border-accent bg-accent-mist text-accent-ink"
                      : "border-ink/12 text-ink-soft hover:border-ink/25"
                  }`}
                >
                  {c >= 100000 ? `₹${c / 100000} lakh` : inr(c)}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={v.salaried}
              onChange={(e) => set("salaried", e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            I&rsquo;m salaried
          </label>

          <div className="pt-4 border-t border-ink/8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-3">
              What you already save / pay
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="80C so far (EPF, ELSS, LIC…)" value={v.ded80c} onChange={(x) => set("ded80c", x)} prefix="₹" step={10000} hint="Max ₹1.5 lakh" />
              <Field label="Health insurance (80D)" value={v.ded80d} onChange={(x) => set("ded80d", x)} prefix="₹" step={5000} />
              <Field label="NPS — your own (80CCD 1B)" value={v.nps1b} onChange={(x) => set("nps1b", x)} prefix="₹" step={5000} hint="Max ₹50,000" />
              <Field label="TDS already deducted" value={v.tds} onChange={(x) => set("tds", x)} prefix="₹" step={5000} hint="Optional — shows refund" />
            </div>

            <details className="mt-4 group">
              <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink">
                More details (HRA, LTA, employer NPS, other income)
                <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <Field label="HRA exemption" value={v.hraExempt} onChange={(x) => set("hraExempt", x)} prefix="₹" step={10000} hint="Old regime only" />
                <Field label="LTA / LTC exemption" value={v.ltaExempt} onChange={(x) => set("ltaExempt", x)} prefix="₹" step={10000} hint="Old regime only" />
                <Field label="Employer NPS (80CCD 2)" value={v.npsEmployer2} onChange={(x) => set("npsEmployer2", x)} prefix="₹" step={10000} hint="Works in both regimes" />
                <Field label="Other income" value={v.otherIncome} onChange={(x) => set("otherIncome", x)} prefix="₹" step={10000} hint="Interest, dividends…" />
              </div>
            </details>
          </div>
        </Card>

        {/* Results — the answer */}
        <div className="space-y-4">
          <Card elevation="lg" className="p-6 md:p-8">
            {plan.alreadyOptimal ? (
              <>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-mist text-accent-ink">
                  <CheckCircle2 size={20} />
                </span>
                <p className="mt-4 font-display text-3xl md:text-4xl text-ink leading-tight">
                  You&rsquo;re already tax-efficient.
                </p>
                <p className="mt-3 text-[15px] text-ink-soft leading-relaxed">
                  At your numbers, the {plan.baselineRegime === "new" ? "New" : "Old"} Regime
                  is your best option and extra 80C/NPS investments won&rsquo;t reduce
                  your tax further. Your estimated tax is{" "}
                  <strong className="text-ink">{inr(plan.baselineTax)}</strong>.
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                  Your tax-saving potential · FY 2025-26
                </p>
                <p className="mt-3 font-display text-5xl md:text-6xl text-ink leading-none tabular-nums">
                  <CountUp value={plan.totalSaving} prefix="₹" duration={900} />
                </p>
                <p className="mt-2 text-[15px] text-ink-soft">
                  more you could save this year — here&rsquo;s exactly how.
                </p>
                <p className="mt-4 text-[14px] text-ink-soft border-t border-ink/8 pt-3">
                  Tax now: <strong className="text-ink">{inr(plan.baselineTax)}</strong>
                  {" → "}after the plan:{" "}
                  <strong className="text-ink">{inr(plan.optimizedTax)}</strong> (
                  {plan.optimizedRegime === "new" ? "New" : "Old"} Regime)
                </p>
              </>
            )}
            {plan.refund !== null ? (
              <p className={`mt-3 text-[14px] ${plan.refund >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {plan.refund >= 0
                  ? `Based on your TDS, you're on track for a ${inr(plan.refund)} refund when you file.`
                  : `Based on your TDS, expect to pay ${inr(-plan.refund)} more when you file.`}
              </p>
            ) : null}
          </Card>

          {/* Action plan */}
          {plan.actions.map((a, i) => (
            <Card key={a.id} elevation="md" className="p-5 md:p-6">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-warm font-display text-[15px] text-ink">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <p className="font-display text-lg text-ink">{a.title}</p>
                    <span className="text-[13px] font-medium text-accent-ink whitespace-nowrap">
                      saves {inr(a.saving)}/yr
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] text-ink-muted">
                    Invest {inr(a.invest)} more
                  </p>
                  <p className="mt-2 text-[14px] text-ink-soft leading-relaxed">{a.step}</p>
                  {a.note ? (
                    <p className="mt-1.5 text-[12px] text-ink-muted">{a.note}</p>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}

          {/* Employer NPS idea — works in both regimes */}
          {plan.employerNpsIdea ? (
            <Card elevation="md" tone="mist" className="p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper-card text-accent-ink shrink-0">
                  <Landmark size={16} />
                </span>
                <div>
                  <p className="font-display text-lg text-ink">
                    Ask HR about corporate NPS — worth ~{inr(plan.employerNpsIdea.saving)}/yr
                  </p>
                  <p className="mt-1.5 text-[14px] text-ink-soft leading-relaxed">
                    If your employer routes ~{inr(plan.employerNpsIdea.invest)} of your
                    CTC into NPS under Section 80CCD(2), it&rsquo;s deductible{" "}
                    <strong>even in the New Regime</strong>. One email to HR can set
                    this up. (Estimate at 10% of basic.)
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Honesty nudge */}
          <p className="inline-flex items-start gap-2 text-xs text-ink-muted leading-relaxed">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            Estimates for FY 2025-26, resident individuals under 60. Invest only in
            what fits your goals — a tax break alone is not a reason to buy a bad
            product. Not tax advice; verify on incometax.gov.in or with a CA.
          </p>
        </div>
      </div>

      {/* Full breakdown, tucked away */}
      <details className="group rounded-3xl bg-paper-card shadow-card-sm p-6 md:p-7">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
          <span className="font-display text-xl text-ink">
            The full breakdown — your tax, explained in plain English
          </span>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-paper-warm text-ink-soft transition-transform group-open:rotate-180">
            <ChevronDown size={16} />
          </span>
        </summary>
        <div className="mt-5">
          <PlainExplanation input={toolkitInput} result={analysis} />
        </div>
      </details>

      {/* Cross-links */}
      <div className="flex flex-wrap gap-2">
        <Chip href="/calculators/hra-calculator" label="Paying rent? Check your HRA exemption" />
        <Chip href="/calculators/income-tax-calculator" label="Compare regimes in detail" />
        <Chip href="/dashboard?upload=1" label="Find money leaks in your statement" />
      </div>
    </div>
  );
}

function Chip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 px-3.5 py-1.5 text-[13px] text-ink-soft hover:bg-accent-mist hover:text-accent-ink hover:border-transparent transition-colors"
    >
      <PiggyBank size={13} /> {label} <ArrowRight size={12} />
    </Link>
  );
}
