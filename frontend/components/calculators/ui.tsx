"use client";

import * as React from "react";

export function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/** Labeled numeric input with an optional ₹ / % adornment. */
export function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  max,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <div className="mt-1.5 flex items-stretch h-11 rounded-xl border border-ink/12 bg-paper-card overflow-hidden focus-within:ring-2 focus-within:ring-accent focus-within:border-transparent">
        {prefix ? (
          <span className="inline-flex items-center px-3 bg-paper-warm text-ink-soft text-sm select-none">
            {prefix}
          </span>
        ) : null}
        <input
          type="number"
          inputMode="numeric"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className="flex-1 min-w-0 px-3 bg-transparent text-ink text-base focus:outline-none"
        />
        {suffix ? (
          <span className="inline-flex items-center px-3 bg-paper-warm text-ink-soft text-sm select-none">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? <span className="mt-1 block text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

/** Range slider paired with the field for nicer UX. */
export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-accent"
    />
  );
}

export function ResultRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className={strong ? "text-ink font-medium" : "text-ink-soft"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-display text-xl text-ink" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 text-xs text-ink-muted leading-relaxed">{children}</p>
  );
}
