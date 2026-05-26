import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StatTile — compact figure + label.
 * Used in dashboard preview and the trust strip.
 */
export function StatTile({
  label,
  value,
  hint,
  className,
  align = "left",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "space-y-1.5",
        align === "center" && "text-center",
        className
      )}
    >
      <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
        {label}
      </p>
      <p className="font-display text-3xl md:text-4xl text-ink leading-none">
        {value}
      </p>
      {hint ? (
        <p className="text-sm text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
