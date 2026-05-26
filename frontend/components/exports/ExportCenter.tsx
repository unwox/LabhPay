"use client";

/**
 * Stage 9 — Export Center.
 *
 * Server generates PDFs in-memory and streams them. Clicking a row hits
 * /exports/{kind}.pdf with credentials and triggers a browser download.
 */

import * as React from "react";
import { Download, FileDown, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  downloadExport,
  listExports,
  type ExportListItem,
  ApiError,
} from "@/lib/api";

export function ExportCenter() {
  const [items, setItems] = React.useState<ExportListItem[] | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    listExports()
      .then((r) => setItems(r.exports))
      .catch(() => setItems(FALLBACK));
  }, []);

  async function go(kind: ExportListItem["kind"]) {
    setBusy(kind);
    setError(null);
    try {
      await downloadExport(kind);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't download. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card elevation="md" className="p-6 md:p-7">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-mist text-accent-ink shrink-0">
          <FileDown size={16} strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            Export center
          </p>
          <p className="mt-0.5 font-display text-xl text-ink leading-tight">
            Take your data with you.
          </p>
          <p className="mt-1 text-[13px] text-ink-soft">
            PDFs are generated on demand and never stored. The file lands in
            your downloads.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {(items ?? FALLBACK).map((it) => (
          <li key={it.kind}>
            <button
              type="button"
              onClick={() => go(it.kind)}
              disabled={busy === it.kind}
              className="w-full text-left rounded-2xl border border-ink/10 bg-paper p-4 hover:border-accent hover:bg-accent-mist/40 transition-colors disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={14} strokeWidth={1.75} className="text-ink-muted shrink-0" />
                  <p className="font-display text-[15px] text-ink truncate">
                    {it.title}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted shrink-0">
                  {busy === it.kind ? "Preparing…" : (
                    <>
                      <Download size={12} /> PDF
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-ink-soft">{it.blurb}</p>
            </button>
          </li>
        ))}
      </ul>

      {error ? (
        <p className="mt-3 text-[13px] text-ink-soft bg-paper-warm rounded-xl p-3">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

// Render something useful even before the catalog loads.
const FALLBACK: ExportListItem[] = [
  { kind: "summary", title: "Summary report",
    blurb: "Top-of-mind view of every loaded statement, totals, and charges." },
  { kind: "yearly", title: "Yearly report",
    blurb: "Month-by-month spend, with a delta against the prior month." },
  { kind: "categories", title: "Category report",
    blurb: "Spending grouped by category with the top merchants per group." },
  { kind: "subscriptions", title: "Subscriptions report",
    blurb: "Recurring charges with monthly and annualised totals." },
  { kind: "tax-summary", title: "Tax-friendly summary",
    blurb: "Insurance, investments, healthcare, utilities — grouped for filing prep." },
];
