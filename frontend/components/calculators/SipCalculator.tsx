"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Field, Slider, ResultRow, Disclaimer, inr } from "./ui";

export function SipCalculator() {
  const [monthly, setMonthly] = React.useState(10000);
  const [rate, setRate] = React.useState(12);
  const [years, setYears] = React.useState(15);

  const n = years * 12;
  const i = rate / 12 / 100;
  // Future value of a monthly SIP (annuity-due: invested at start of month).
  const fv =
    i === 0 ? monthly * n : monthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const invested = monthly * n;
  const gains = fv - invested;
  const gainsPct = fv > 0 ? (gains / fv) * 100 : 0;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card elevation="md" className="p-5 md:p-6 space-y-5">
        <div>
          <Field label="Monthly investment" value={monthly} onChange={setMonthly} prefix="₹" step={500} />
          <Slider value={monthly} onChange={setMonthly} min={500} max={200000} step={500} />
        </div>
        <div>
          <Field label="Expected return (per annum)" value={rate} onChange={setRate} suffix="%" step={0.5} />
          <Slider value={rate} onChange={setRate} min={1} max={30} step={0.5} />
        </div>
        <div>
          <Field label="Time period" value={years} onChange={setYears} suffix="years" step={1} />
          <Slider value={years} onChange={setYears} min={1} max={40} step={1} />
        </div>
      </Card>

      <div className="space-y-4">
        <Card elevation="lg" className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            Estimated value
          </p>
          <p className="mt-2 font-display text-4xl text-ink tabular-nums">{inr(fv)}</p>
          <div className="mt-4 border-t border-ink/8 pt-2 text-sm">
            <ResultRow label="Total invested" value={inr(invested)} />
            <ResultRow label="Estimated gains" value={inr(gains)} />
            <ResultRow label="Final value" value={inr(fv)} strong />
          </div>
          <div className="mt-4">
            <div className="h-2.5 w-full rounded-full bg-accent overflow-hidden flex">
              <div className="h-full bg-paper-warm" style={{ width: `${100 - gainsPct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-ink-muted">
              <span>Invested {(100 - gainsPct).toFixed(0)}%</span>
              <span>Gains {gainsPct.toFixed(0)}%</span>
            </div>
          </div>
        </Card>
        <Disclaimer>
          Returns are assumed constant for illustration only. Actual mutual-fund
          returns vary and are not guaranteed. This is not investment advice —
          consider consulting a SEBI-registered adviser.
        </Disclaimer>
      </div>
    </div>
  );
}
