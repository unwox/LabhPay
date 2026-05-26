import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Apple-Wallet-style stylized statement card. Pure presentational.
 * Used in Hero + DashboardPreview.
 */
export function StatementCard({
  bank,
  last4,
  outstanding,
  dueDate,
  tone = "ink",
  className,
  style,
}: {
  bank: string;
  last4: string;
  outstanding: string;
  dueDate: string;
  tone?: "ink" | "emerald" | "gold" | "paper";
  className?: string;
  style?: React.CSSProperties;
}) {
  const toneClasses = {
    ink: "bg-[linear-gradient(155deg,#15151B_0%,#2A2A33_100%)] text-paper",
    emerald:
      "bg-[linear-gradient(155deg,#0E5C49_0%,#082E26_100%)] text-paper",
    gold: "bg-[linear-gradient(155deg,#B8865A_0%,#7E5A38_100%)] text-paper",
    paper: "bg-paper-card text-ink shadow-card",
  }[tone];

  return (
    <div
      style={style}
      className={cn(
        "tilt relative overflow-hidden rounded-3xl",
        "aspect-[1.586/1] w-[280px] md:w-[340px]",
        "p-5 md:p-6 shadow-card-xl",
        toneClasses,
        className
      )}
    >
      {/* Sheen */}
      <div className="absolute inset-0 bg-card-sheen pointer-events-none" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-display text-base md:text-lg tracking-wide">
            {bank}
          </span>
          <span className="text-[10px] uppercase tracking-eyebrow opacity-70">
            Credit
          </span>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-eyebrow opacity-60">
            Outstanding
          </p>
          <p className="font-display text-3xl md:text-4xl leading-none">
            {outstanding}
          </p>
        </div>

        <div className="flex items-end justify-between text-[11px]">
          <span className="font-mono tracking-widest opacity-85">
            •••• {last4}
          </span>
          <span className="opacity-70">Due {dueDate}</span>
        </div>
      </div>
    </div>
  );
}
