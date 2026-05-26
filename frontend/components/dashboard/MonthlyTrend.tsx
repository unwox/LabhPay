"use client";

import * as React from "react";
import { inr, fmtMonth } from "@/lib/format";

/**
 * Tiny SVG sparkline-with-axis trend.
 * No chart library — keeps bundle lean and matches the calm design.
 */
export function MonthlyTrend({
  data,
}: {
  data: { month: string; total: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-ink-muted text-sm">
        Upload more statements to see your monthly trend.
      </p>
    );
  }

  const w = 560;
  const h = 160;
  const pad = { l: 16, r: 16, t: 12, b: 28 };

  const max = Math.max(...data.map((d) => d.total), 1);
  const xs = (i: number) =>
    data.length === 1
      ? (w - pad.l - pad.r) / 2 + pad.l
      : pad.l + (i * (w - pad.l - pad.r)) / (data.length - 1);
  const ys = (v: number) =>
    pad.t + (1 - v / max) * (h - pad.t - pad.b);

  const points = data.map((d, i) => `${xs(i)},${ys(d.total)}`).join(" ");
  const areaPoints = `${pad.l},${h - pad.b} ${points} ${xs(data.length - 1)},${h - pad.b}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        role="img"
        aria-label="Monthly spending trend"
      >
        {/* Axis baseline */}
        <line
          x1={pad.l} x2={w - pad.r}
          y1={h - pad.b} y2={h - pad.b}
          stroke="#E2DED3" strokeWidth={1}
        />

        {/* Area */}
        <polygon points={areaPoints} fill="rgba(14,92,73,0.10)" />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#0E5C49"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points + labels */}
        {data.map((d, i) => (
          <g key={d.month}>
            <circle cx={xs(i)} cy={ys(d.total)} r={3.5} fill="#0E5C49" />
            <text
              x={xs(i)}
              y={h - pad.b + 16}
              fontSize="10"
              textAnchor="middle"
              fill="#76767F"
            >
              {fmtMonth(d.month)}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
        <span>Highest: {inr(max)}</span>
        <span>{data.length} month{data.length === 1 ? "" : "s"}</span>
      </div>
    </div>
  );
}
