import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * LabhPay button. Premium, calm, never shouty.
 * Variants tuned in Stage 2 alongside the rest of the design system.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary: deep ink pill — anchor of every CTA.
        primary:
          "bg-ink text-paper hover:bg-ink-soft shadow-card-sm hover:shadow-card",
        // Accent: emerald — used sparingly for high-intent CTAs.
        accent:
          "bg-accent text-paper hover:bg-accent-ink shadow-card-sm hover:shadow-card",
        // Outline: hairline border on paper.
        outline:
          "border border-ink/12 bg-paper text-ink hover:bg-accent-mist hover:border-ink/20",
        // Ghost: text-button, used in nav and inline.
        ghost:
          "bg-transparent text-ink hover:bg-accent-mist",
        // Link: inline text with underline-on-hover.
        link:
          "bg-transparent text-ink underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-5",
        lg: "h-14 px-7 text-base",
        xl: "h-16 px-9 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
