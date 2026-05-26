import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Section — consistent vertical rhythm + max-width container.
 * Wrap every landing block in this.
 */
export function Section({
  className,
  size = "md",
  bleed = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  size?: "sm" | "md" | "lg" | "xl";
  bleed?: boolean;
}) {
  const vert = {
    sm: "py-12 md:py-16",
    md: "py-16 md:py-24",
    lg: "py-20 md:py-32",
    xl: "py-24 md:py-40",
  }[size];
  return (
    <section className={cn("relative", vert, className)} {...props}>
      {bleed ? (
        children
      ) : (
        <div className="mx-auto max-w-site px-[var(--site-gutter)]">{children}</div>
      )}
    </section>
  );
}

export function Eyebrow({
  className,
  children,
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-block text-[11px] uppercase tracking-eyebrow text-ink-muted",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  className,
  children,
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "font-display text-display-sm md:text-display-md text-ink",
        className
      )}
    >
      {children}
    </h2>
  );
}

export function SectionLede({
  className,
  children,
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "max-w-prose text-base md:text-lg text-ink-soft leading-relaxed",
        className
      )}
    >
      {children}
    </p>
  );
}
