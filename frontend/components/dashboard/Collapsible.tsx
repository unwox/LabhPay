"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Progressive-disclosure section. Shows a calm header (title + a one-line
 * summary the user can read at a glance) and reveals the detail only when
 * they choose to dig in. This is the core of the de-cluttered dashboard:
 * the overview stays scannable, depth is one tap away.
 */
export function Collapsible({
  eyebrow,
  title,
  summary,
  badge,
  defaultOpen = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  summary?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Card elevation="md" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 p-5 md:p-6 text-left hover:bg-accent-mist/40 transition-colors"
      >
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
              {eyebrow}
            </p>
          ) : null}
          <p className="mt-0.5 font-display text-xl text-ink leading-tight">
            {title}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {summary ? (
            <span className="text-sm text-ink-soft hidden sm:block">{summary}</span>
          ) : null}
          {badge}
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-paper-warm text-ink-soft transition-transform ${
              open ? "rotate-180" : ""
            }`}
          >
            <ChevronDown size={16} />
          </span>
        </div>
      </button>
      {open ? (
        <div className="px-5 md:px-6 pb-6 border-t border-ink/6 pt-5">
          {children}
        </div>
      ) : null}
    </Card>
  );
}
