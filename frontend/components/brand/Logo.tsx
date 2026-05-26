import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * LabhPay brand mark.
 * Serif "Labh" + sans "Pay" — the duality of the design system itself.
 * Tiny emerald dot over the "i" of the wordmark area for memorability.
 */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }[size];
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-[2px] leading-none select-none",
        dim,
        className
      )}
      aria-label="LabhPay"
    >
      <span className="font-display italic tracking-tight text-ink">Labh</span>
      <span className="relative">
        <span className="font-sans font-medium tracking-tight text-ink">Pay</span>
        <span
          aria-hidden
          className="absolute -top-[2px] right-[1px] block h-[5px] w-[5px] rounded-full bg-accent"
        />
      </span>
    </span>
  );
}
