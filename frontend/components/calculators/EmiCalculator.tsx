"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Field, Slider, ResultRow, Disclaimer, inr } from "./ui";

export function EmiCalculator() {
  const [principal, setPrincipal] = React.useState(3000000);
  const [rate, setRate] = React.useState(8.5);
  const [years, setYears] = React.useState(20);

  const n = years * 12;
  const r = rate / 12 / 100;
  const emi =
    r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total = emi * n;
  const interest = total - principal;
  const interestPct = total > 0 ? (interest / total) * 100 : 0;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card elevation="md" className="p-5 md:p-6 space-y-5">
        <div>
          <Field label="Loan amount" value={principal} onChange={setPrincipal} prefix="₹" step={50000} />
          <Slider value={principal} onChange={setPrincipal} min={50000} max={20000000} step={50000} />
        </div>
        <div>
          <Field label="Interest rate (per annum)" value={rate} onChange={setRate} suffix="%" step={0.1} />
          <Slider value={rate} onChange={setRate} min={5} max={20} step={0.1} />
        </div>
        <div>
          <Field label="Tenure" value={years} onChange={setYears} suffix="years" step={1} />
          <Slider value={years} onChange={setYears} min={1} max={30} step={1} />
        </div>
      </Card>

      <div className="space-y-4">
        <Card elevation="lg" className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            Monthly EMI
          </p>
          <p className="mt-2 font-display text-4xl text-ink tabular-nums">{inr(emi)}</p>
          <div className="mt-4 border-t border-ink/8 pt-2 text-sm">
            <ResultRow label="Principal" value={inr(principal)} />
            <ResultRow label="Total interest" value={inr(interest)} />
            <ResultRow label="Total payable" value={inr(total)} strong />
          </div>
          {/* Interest vs principal bar */}
          <div className="mt-4">
            <div className="h-2.5 w-full rounded-full bg-accent overflow-hidden flex">
              <div className="h-full bg-paper-warm" style={{ width: `${100 - interestPct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-ink-muted">
              <span>Principal {(100 - interestPct).toFixed(0)}%</span>
              <span>Interest {interestPct.toFixed(0)}%</span>
            </div>
          </div>
        </Card>
        <Disclaimer>
          Indicative EMI using the standard reducing-balance formula. Your bank&rsquo;s
          actual EMI may differ slightly due to processing fees, insurance, or the
          exact day-count method.
        </Disclaimer>
      </div>
    </div>
  );
}
