import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * LabhPay brand mark: the circular gradient logo + the "LabhPay" wordmark.
 * The logo art is a circle on a white square, so we clip it to a circle (and
 * scale slightly) to drop the white corners on the cream background.
 */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const text = { sm: "text-lg", md: "text-xl", lg: "text-2xl" }[size];
  const mark = { sm: 26, md: 30, lg: 38 }[size];

  return (
    <span
      className={cn("inline-flex items-center gap-2 leading-none select-none", className)}
      aria-label="LabhPay"
    >
      <span
        className="relative shrink-0 rounded-full overflow-hidden ring-1 ring-ink/5"
        style={{ width: mark, height: mark }}
      >
        <Image
          src="/labhpay-logo.png"
          alt=""
          width={Math.round(mark * 1.22)}
          height={Math.round(mark * 1.22)}
          priority
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none"
        />
      </span>
      <span className={cn("inline-flex items-baseline gap-[2px]", text)}>
        <span className="font-display italic tracking-tight text-ink">Labh</span>
        <span className="font-sans font-medium tracking-tight text-ink">Pay</span>
      </span>
    </span>
  );
}
