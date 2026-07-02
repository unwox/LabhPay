"use client";

import * as React from "react";
import Link from "next/link";
import { Download, Lightbulb, AlertTriangle, FileWarning } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, ResultRow, inr } from "@/components/calculators/ui";
import { useAuth } from "@/lib/auth-context";
import { analyzeTax, type TaxToolkitInput } from "@/lib/tax/analyze";
import { PlainExplanation } from "@/components/tax/PlainExplanation";
import { MultiDocUpload } from "@/components/tax/MultiDocUpload";

const DEFAULTS: TaxToolkitInput = {
  grossSalary: 1200000,
  otherIncome: 0,
  salaried: true,
  tdsPaid: 90000,
  ded80c: 150000,
  ded80d: 25000,
  hraExempt: 0,
  ltaExempt: 0,
  homeLoanInterest: 0,
  nps80ccd1b: 0,
  npsEmployer80ccd2: 0,
  otherDeductions: 0,
  capitalGains: 0,
};

export function TaxToolkit() {
  const { user } = useAuth();
  const [v, setV] = React.useState<TaxToolkitInput>(DEFAULTS);
  const set = (k: keyof TaxToolkitInput, val: number | boolean) =>
    setV((s) => ({ ...s, [k]: val as never }));

  const r = analyzeTax(v);

  return (
    <div className="space-y-6">
      <MultiDocUpload
        loggedIn={!!user}
        onMerged={(f) =>
          setV((s) => ({
            ...s,
            grossSalary: f.gross_salary || s.grossSalary,
            otherIncome: f.other_income || s.otherIncome,
            capitalGains: f.capital_gains || s.capitalGains,
            hraExempt: f.hra_exempt || s.hraExempt,
            ltaExempt: f.lta_exempt || s.ltaExempt,
            ded80c: f.ded_80c || s.ded80c,
            ded80d: f.ded_80d || s.ded80d,
            nps80ccd1b: f.nps_80ccd1b || s.nps80ccd1b,
            npsEmployer80ccd2: f.nps_employer_80ccd2 || s.npsEmployer80ccd2,
            homeLoanInterest: f.home_loan_interest || s.homeLoanInterest,
            otherDeductions: f.other_deductions || s.otherDeductions,
            tdsPaid: f.tds || s.tdsPaid,
          }))
        }
      />

      {/* Answer first — the report in plain English */}
      <PlainExplanation input={v} result={r} />

      {/* Pro flags */}
      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-warm px-3 py-1.5 text-[13px] text-ink">
          Suggested form: <strong>{r.itrForm}</strong>
        </span>
        {r.hasCapitalGains ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[13px] text-amber-800">
            <AlertTriangle size={13} /> Capital gains detected — taxed separately, file ITR-2
          </span>
        ) : null}
      </div>

      {r.hasCapitalGains ? (
        <Card elevation="md" className="p-5 md:p-6 border border-amber-200">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 shrink-0">
              <FileWarning size={16} />
            </span>
            <div>
              <p className="font-display text-lg text-ink">You have capital gains</p>
              <p className="mt-1 text-[15px] text-ink-soft leading-relaxed">
                Capital gains ({inr(v.capitalGains)}) are taxed at special rates
                (e.g. 12.5% or 20%, with exemptions) — <strong>not</strong> included
                in the estimate above. You&rsquo;ll need to file <strong>ITR-2</strong>,
                and this part is genuinely worth a chartered accountant&rsquo;s eye.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* The numbers, to check or adjust */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-3">
          The numbers · adjust anything to see it update
        </p>
        <div className="grid lg:grid-cols-2 gap-5">
        {/* Inputs */}
        <Card elevation="md" className="p-5 md:p-6 space-y-4">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">Your income</p>
          <Field label="Gross salary (annual)" value={v.grossSalary} onChange={(x) => set("grossSalary", x)} prefix="₹" step={50000} hint="Salary before exemptions (Form 16, section 17(1))" />
          <Field label="Other income" value={v.otherIncome} onChange={(x) => set("otherIncome", x)} prefix="₹" step={10000} hint="Interest, dividends, etc. (from AIS / 26AS)" />
          <Field label="Capital gains" value={v.capitalGains} onChange={(x) => set("capitalGains", x)} prefix="₹" step={10000} hint="Shares / MF / property sold. Taxed separately — flagged below." />
          <Field label="Tax already deducted (TDS)" value={v.tdsPaid} onChange={(x) => set("tdsPaid", x)} prefix="₹" step={5000} hint="Total from Form 16 + Form 26AS" />
          <Field label="Employer NPS — 80CCD(2)" value={v.npsEmployer80ccd2} onChange={(x) => set("npsEmployer80ccd2", x)} prefix="₹" step={10000} hint="Your employer's NPS contribution. Deductible in BOTH regimes — check your payslip." />

          <div className="pt-3 border-t border-ink/8">
            <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted mb-3">Your deductions (Old Regime)</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="80C" value={v.ded80c} onChange={(x) => set("ded80c", x)} prefix="₹" step={10000} hint="Max ₹1.5L" />
              <Field label="80D health insurance" value={v.ded80d} onChange={(x) => set("ded80d", x)} prefix="₹" step={5000} />
              <Field label="NPS 80CCD(1B)" value={v.nps80ccd1b} onChange={(x) => set("nps80ccd1b", x)} prefix="₹" step={5000} hint="Extra ₹50k" />
              <Field label="Home loan interest" value={v.homeLoanInterest} onChange={(x) => set("homeLoanInterest", x)} prefix="₹" step={50000} hint="Max ₹2L" />
              <Field label="HRA exemption" value={v.hraExempt} onChange={(x) => set("hraExempt", x)} prefix="₹" step={10000} hint="Old regime only — taxed in new" />
              <Field label="LTA / LTC exemption" value={v.ltaExempt} onChange={(x) => set("ltaExempt", x)} prefix="₹" step={10000} hint="Old regime only — your LTC is taxed in the new regime" />
              <Field label="Other (80E, 80G…)" value={v.otherDeductions} onChange={(x) => set("otherDeductions", x)} prefix="₹" step={10000} />
            </div>
          </div>
        </Card>

        {/* Regime comparison — supporting detail */}
        <div className="grid sm:grid-cols-2 gap-4 content-start">
          <RegimeCard title="New Regime" tax={r.newRegime.totalTax} taxable={r.newRegime.taxableIncome} best={r.recommended === "new"} />
          <RegimeCard title="Old Regime" tax={r.oldRegime.totalTax} taxable={r.oldRegime.taxableIncome} best={r.recommended === "old"} />
        </div>
        </div>
      </div>

      {/* Missed deductions — only when the Old Regime is the better choice
          (under the New Regime these deductions don't reduce tax, so showing
          them would just confuse). */}
      {r.missed.length && r.recommended === "old" ? (
        <Card elevation="md" className="p-5 md:p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-mist text-accent-ink shrink-0">
              <Lightbulb size={16} />
            </span>
            <div>
              <p className="font-display text-xl text-ink">Deductions you might be missing</p>
              <p className="mt-1 text-ink-soft text-sm">
                These reduce tax under the Old Regime. Educational only — not tax advice.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-3">
            {r.missed.map((m) => (
              <li key={m.code} className="rounded-2xl bg-paper-warm/60 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-medium text-ink">{m.label}</p>
                  <span className="text-[13px] text-accent-ink">
                    Up to {inr(m.headroom)} more · save ~{inr(m.potentialSaving)}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-ink-soft">{m.note}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* ITR-ready summary */}
      <ItrSummary v={v} r={r} />

      <p className="text-xs text-ink-muted leading-relaxed">
        Estimates for {r.fy}, resident individuals below 60. Includes standard
        deduction, 87A rebate, common surcharge tiers and 4% cess; some edge cases
        are simplified. This is not tax advice — verify on incometax.gov.in or with
        a CA before filing.
      </p>
    </div>
  );
}

function RegimeCard({ title, tax, taxable, best }: { title: string; tax: number; taxable: number; best: boolean }) {
  return (
    <Card elevation="md" className={`p-5 ${best ? "ring-2 ring-accent" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="font-display text-lg text-ink">{title}</p>
        {best ? (
          <span className="text-[10px] uppercase tracking-eyebrow bg-accent-mist text-accent-ink px-2 py-0.5 rounded-full">
            Lower tax
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-3xl text-ink tabular-nums">{inr(tax)}</p>
      <p className="text-xs text-ink-muted">total tax</p>
      <div className="mt-3 border-t border-ink/8 pt-2 text-sm">
        <ResultRow label="Taxable income" value={inr(taxable)} />
      </div>
    </Card>
  );
}

function ItrSummary({ v, r }: { v: TaxToolkitInput; r: ReturnType<typeof analyzeTax> }) {
  function download() {
    const lines = [
      `LabhPay — Tax summary (${r.fy})`,
      `Generated: ${new Date().toLocaleString("en-IN")}`,
      "",
      `Gross income: ${inr(r.gross)}`,
      `Recommended regime: ${r.recommended === "new" ? "New" : "Old"}`,
      `Taxable income (recommended): ${inr(r.recommended === "new" ? r.newRegime.taxableIncome : r.oldRegime.taxableIncome)}`,
      `Estimated tax: ${inr(r.recommendedTax)}`,
      `TDS already paid: ${inr(r.tds)}`,
      r.refund >= 0 ? `Estimated refund: ${inr(r.refund)}` : `Estimated tax payable: ${inr(-r.refund)}`,
      "",
      `New regime tax: ${inr(r.newRegime.totalTax)}`,
      `Old regime tax: ${inr(r.oldRegime.totalTax)}`,
      "",
      "Deductions entered (old regime):",
      `  80C: ${inr(v.ded80c)}`,
      `  80D: ${inr(v.ded80d)}`,
      `  NPS 80CCD(1B): ${inr(v.nps80ccd1b)}`,
      `  Home loan interest: ${inr(v.homeLoanInterest)}`,
      `  HRA exemption: ${inr(v.hraExempt)}`,
      `  Other: ${inr(v.otherDeductions)}`,
      "",
      "Estimate only — not tax advice. Verify on incometax.gov.in or with a CA.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "labhpay-tax-summary.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card elevation="md" tone="mist" className="p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-display text-xl text-ink">Your ITR-ready summary</p>
          <p className="mt-1 text-ink-soft text-sm">
            A clean snapshot to keep, or hand to your CA when filing.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={download}>
          <Download size={14} className="mr-1.5" /> Download summary
        </Button>
      </div>
    </Card>
  );
}
