import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Small inline badge — icon + label.
 * Used in nav, hero subtext, and the privacy strip.
 */
export function TrustBadge({
  icon,
  label,
  className,
  tone = "muted",
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  className?: string;
  tone?: "muted" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px]",
        tone === "muted" &&
          "border-ink/10 bg-paper-card text-ink-soft",
        tone === "accent" &&
          "border-accent/20 bg-accent-mist text-accent-ink",
        className
      )}
    >
      {icon ? <span className="opacity-80">{icon}</span> : null}
      <span>{label}</span>
    </span>
  );
}
