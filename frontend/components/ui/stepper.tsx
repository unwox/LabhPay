import * as React from "react";
import { cn } from "@/lib/utils";

type Step = {
  title: string;
  body: string;
  index: number;
};

export function Stepper({
  steps,
  className,
}: {
  steps: Step[];
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8",
        className
      )}
    >
      {steps.map((s) => (
        <li
          key={s.index}
          className="relative rounded-2xl bg-paper-card p-6 md:p-7 shadow-card-sm"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft font-display text-accent-ink">
              {String(s.index).padStart(2, "0")}
            </span>
            <h3 className="font-display text-xl text-ink">{s.title}</h3>
          </div>
          <p className="mt-3 text-[15px] text-ink-soft leading-relaxed">
            {s.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
