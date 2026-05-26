"use client";

import * as React from "react";
import { inr, pct, titleCase } from "@/lib/format";

const PALETTE = [
  "#15151B", // ink
  "#0E5C49", // emerald
  "#B8865A", // gold
  "#6B6B76", // muted
  "#A3B8B0", // sage
  "#D4B89A", // pale gold
  "#3E3E48", // graphite
  "#C2C2C8", // faint
];

export function CategoryDonut({
  data,
}: {
  data: { category: string; amount: number; pct: number }[];
}) {
  // Take top 6 categories + collapse the rest as "Other".
  const top = data.slice(0, 6);
  const rest = data.slice(6);
  const restAmt = rest.reduce((a, r) => a + r.amount, 0);
  const restPct = rest.reduce((a, r) => a + r.pct, 0);
  const slices = restAmt > 0
    ? [...top, { category: "other", amount: restAmt, pct: restPct }]
    : top;

  if (!slices.length) {
    return (
      <p className="text-ink-muted text-sm">
        No spending yet. Upload a statement to see the breakdown.
      </p>
    );
  }

  const size = 220;
  const r = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const total = slices.reduce((a, s) => a + s.pct, 0) || 1;

  return (
    <div className="grid md:grid-cols-2 gap-6 items-center">
      <div className="relative mx-auto md:mx-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background ring */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke="#F3EFE7" strokeWidth={20}
          />
          {slices.map((s, i) => {
            const len = (s.pct / total) * circ;
            const dasharray = `${len} ${circ - len}`;
            const dashoffset = -offset;
            offset += len;
            return (
              <circle
                key={s.category}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={20}
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
              Top spend
            </p>
            <p className="mt-1 font-display text-xl text-ink">
              {slices[0] ? titleCase(slices[0].category) : "—"}
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-2.5">
        {slices.map((s, i) => (
          <li key={s.category} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span className="text-ink truncate">{titleCase(s.category)}</span>
            </span>
            <span className="flex items-center gap-3 text-ink-muted shrink-0">
              <span className="tabular-nums">{inr(s.amount)}</span>
              <span className="tabular-nums w-10 text-right">{pct(s.pct)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
