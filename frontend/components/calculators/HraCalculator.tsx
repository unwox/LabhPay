"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Field, ResultRow, Disclaimer, inr } from "./ui";

export function HraCalculator() {
  const [basic, setBasic] = React.useState(600000); // annual basic + DA
  const [hraReceived, setHraReceived] = React.useState(300000);
  const [rentPaid, setRentPaid] = React.useState(240000);
  const [metro, setMetro] = React.useState(true);

  // HRA exemption = least of the three (Section 10(13A)).
  const a = hraReceived;
  const b = rentPaid - 0.1 * basic;
  const c = (metro ? 0.5 : 0.4) * basic;
  const exempt = Math.max(0, Math.min(a, b, c));
  const taxable = Math.max(0, hraReceived - exempt);

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card elevation="md" className="p-5 md:p-6 space-y-4">
        <Field label="Basic salary + DA (annual)" value={basic} onChange={setBasic} prefix="₹" step={10000} />
        <Field label="HRA received (annual)" value={hraReceived} onChange={setHraReceived} prefix="₹" step={10000} />
        <Field label="Rent paid (annual)" value={rentPaid} onChange={setRentPaid} prefix="₹" step={10000} />
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={metro}
            onChange={(e) => setMetro(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          I live in a metro city (Delhi, Mumbai, Kolkata, Chennai)
        </label>
      </Card>

      <div className="space-y-4">
        <Card elevation="lg" className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            HRA exemption
          </p>
          <p className="mt-2 font-display text-4xl text-ink tabular-nums">{inr(exempt)}</p>
          <p className="mt-1 text-ink-soft text-sm">exempt from tax (Old Regime)</p>
          <div className="mt-4 border-t border-ink/8 pt-2 text-sm">
            <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted mb-1">
              Least of the three
            </p>
            <ResultRow label="Actual HRA received" value={inr(a)} />
            <ResultRow label="Rent − 10% of basic" value={inr(Math.max(0, b))} />
            <ResultRow label={`${metro ? "50%" : "40%"} of basic`} value={inr(c)} />
            <div className="border-t border-ink/8 mt-1 pt-1">
              <ResultRow label="Taxable HRA" value={inr(taxable)} strong />
            </div>
          </div>
        </Card>
        <Disclaimer>
          HRA exemption under Section 10(13A) applies to the Old Regime only (not
          the New Regime). Estimate only — confirm with your employer or a CA.
        </Disclaimer>
      </div>
    </div>
  );
}
