import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card — the base surface. Always rounded, always soft-shadowed.
 * Stage 5 builds dashboard tiles on top of this.
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    elevation?: "sm" | "md" | "lg" | "xl";
    tone?: "paper" | "ink" | "mist";
  }
>(({ className, elevation = "md", tone = "paper", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl",
      tone === "paper" && "bg-paper-card",
      tone === "ink" && "bg-paper-ink text-paper",
      tone === "mist" && "bg-accent-mist",
      elevation === "sm" && "shadow-card-sm",
      elevation === "md" && "shadow-card",
      elevation === "lg" && "shadow-card-lg",
      elevation === "xl" && "shadow-card-xl",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 md:p-7", className)} {...props} />;
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6 md:px-7 md:pb-7", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-4 md:px-7 border-t border-ink/8 text-sm text-ink-muted",
        className
      )}
      {...props}
    />
  );
}
