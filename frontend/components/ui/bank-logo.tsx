import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Bank wordmark.
 * We intentionally render banks as muted display-type wordmarks rather than
 * their actual brand logos — keeps the page legally clean, lighter, and on-brand
 * with the Zara-style luxury restraint.
 */
export function BankLogo({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "wordmark text-base md:text-lg whitespace-nowrap select-none",
        "opacity-80 hover:opacity-100 transition-opacity",
        className
      )}
      aria-label={name}
    >
      {name}
    </span>
  );
}
