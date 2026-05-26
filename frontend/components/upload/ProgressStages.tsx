"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobStage } from "@/lib/api";

const ORDER: { stage: JobStage; label: string }[] = [
  { stage: "queued",       label: "Queued" },
  { stage: "decrypting",   label: "Decrypting" },
  { stage: "extracting",   label: "Reading" },
  { stage: "parsing",      label: "Identifying" },
  { stage: "categorizing", label: "Tagging" },
  { stage: "done",         label: "Ready" },
];

export function ProgressStages({ stage }: { stage: JobStage }) {
  const currentIdx = ORDER.findIndex((o) => o.stage === stage);
  // For special stages, snap to the closest pipeline position.
  const idx =
    stage === "ocr" ? ORDER.findIndex((o) => o.stage === "extracting")
      : stage === "needs_password" ? 1
      : stage === "failed" ? ORDER.length
      : currentIdx;

  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {ORDER.map((o, i) => {
        const done = i < idx || (stage === "done" && i <= idx);
        const active = i === idx && stage !== "done";
        return (
          <React.Fragment key={o.stage}>
            <li
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                done && "bg-accent-soft text-accent-ink",
                active && "bg-paper-warm text-ink",
                !done && !active && "bg-paper-card text-ink-muted"
              )}
            >
              {done ? (
                <Check size={13} />
              ) : active ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-faint" />
              )}
              <span>{o.label}</span>
            </li>
            {i < ORDER.length - 1 ? (
              <span className="text-ink-faint">·</span>
            ) : null}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
