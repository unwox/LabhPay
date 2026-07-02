"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Field, ResultRow, Disclaimer, inr } from "./ui";
import { computeTax, FY_LABEL, type Regime } from "@/lib/calculators/incomeTax";

export function IncomeTaxCalculator() {
  const [income, setIncome] = React.useState(1200000);
  const [salaried, setSalaried] = React.useState(true);
  const [ded80c, setDed80c] = React.useState(150000);
  const [ded80d, setDed80d] = React.useState(25000);
  const [hra, setHra] = React.useState(0);
  const [homeLoan, setHomeLoan] = React.useState(0);
  const [other, setOther] = React.useState(0);

  const base = {
    grossIncome: income,
    salaried,
    ded80c,
    ded80d,
    hraExempt: hra,
    homeLoanInterest: homeLoan,
    otherDeductions: other,
  };
  const newR = computeTax({ ...base, regime: "new" as Regime });
  const oldR = computeTax({ ...base, regime: "old" as Regime });
  const better = newR.totalTax <= oldR.totalTax ? "new" : "old";
  const saving = Math.abs(newR.totalTax - oldR.totalTax);

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Inputs */}
      <Card elevation="md" className="p-5 md:p-6 space-y-4">
        <Field
          label="Annual gross income"
          value={income}
          onChange={setIncome}
          prefix="₹"
          step={50000}
        />
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={salaried}
            onChange={(e) => setSalaried(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          I&rsquo;m salaried (eligible for standard deduction)
        </label>

        <div className="pt-2 border-t border-ink/8">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted mb-3">
            Deductions (used by Old Regime only)
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="80C (PF, ELSS, LIC…)" value={ded80c} onChange={setDed80c} prefix="₹" step={10000} hint="Max ₹1,50,000" />
            <Field label="80D (health insurance)" value={ded80d} onChange={setDed80d} prefix="₹" step={5000} />
            <Field label="HRA exemption" value={hra} onChange={setHra} prefix="₹" step={10000} />
            <Field label="Home loan interest" value={homeLoan} onChange={setHomeLoan} prefix="₹" step={50000} hint="Max ₹2,00,000" />
            <Field label="Other (80CCD, 80E…)" value={other} onChange={setOther} prefix="₹" step={10000} />
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <Card elevation="lg" className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            Recommended for you · {FY_LABEL}
          </p>
          <p className="mt-2 font-display text-2xl text-ink">
            {better === "new" ? "New Regime" : "Old Regime"} saves you {inr(saving)}
          </p>
          <p className="mt-1 text-ink-soft text-sm">
            Based on the numbers above. Switching regimes is allowed each year for
            salaried individuals.
          </p>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <RegimeCard title="New Regime" r={newR} highlight={better === "new"} />
          <RegimeCard title="Old Regime" r={oldR} highlight={better === "old"} />
        </div>

        <Disclaimer>
          Estimate for {FY_LABEL}, for resident individuals below 60. Includes 4%
          cess and common surcharge tiers; senior-citizen slabs and some
          edge-cases are simplified. Verify on incometax.gov.in or with a CA
          before filing — this is not tax advice.
        </Disclaimer>
      </div>
    </div>
  );
}

function RegimeCard({
  title,
  r,
  highlight,
}: {
  title: string;
  r: ReturnType<typeof computeTax>;
  highlight: boolean;
}) {
  return (
    <Card
      elevation="md"
      className={`p-5 ${highlight ? "ring-2 ring-accent" : ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-lg text-ink">{title}</p>
        {highlight ? (
          <span className="text-[10px] uppercase tracking-eyebrow bg-accent-mist text-accent-ink px-2 py-0.5 rounded-full">
            Lower tax
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-3xl text-ink tabular-nums">
        {inr(r.totalTax)}
      </p>
      <p className="text-xs text-ink-muted">total tax payable</p>
      <div className="mt-4 text-sm border-t border-ink/8 pt-2">
        <ResultRow label="Taxable income" value={inr(r.taxableIncome)} />
        <ResultRow label="Tax before rebate" value={inr(r.baseTax)} />
        {r.rebate > 0 ? <ResultRow label="87A rebate" value={"− " + inr(r.rebate)} /> : null}
        {r.surcharge > 0 ? <ResultRow label="Surcharge" value={inr(r.surcharge)} /> : null}
        <ResultRow label="Health & edu cess (4%)" value={inr(r.cess)} />
        <ResultRow label="Effective rate" value={`${r.effectiveRate}%`} />
      </div>
    </Card>
  );
}
