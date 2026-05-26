"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import type { ApiTxn, ApiStatementMeta } from "@/lib/api";
import { ResolutionModal } from "@/components/resolution/ResolutionModal";

function inr(amt: string | null): string {
  if (amt == null) return "—";
  const n = Number(amt);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return d;
  }
}

export function StatementHeader({ meta }: { meta: ApiStatementMeta }) {
  return (
    <div className="rounded-2xl bg-paper-card p-6 md:p-7 shadow-card">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
        {meta.bank_display}{meta.card_last4 ? ` · •••• ${meta.card_last4}` : ""}
      </p>
      <p className="mt-2 font-display text-4xl md:text-5xl text-ink leading-none">
        {inr(meta.total_outstanding)}
      </p>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Stat label="Minimum due" value={inr(meta.minimum_due)} />
        <Stat label="Due date" value={fmtDate(meta.due_date)} />
        <Stat label="Available limit" value={inr(meta.available_limit)} />
        <Stat label="Finance + GST" value={inr(
          (Number(meta.finance_charges || 0) + Number(meta.gst_on_charges || 0)).toString()
        )} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-lg text-ink">{value}</p>
    </div>
  );
}

export function TransactionsTable({
  txns,
  jobId,
}: {
  txns: ApiTxn[];
  jobId?: string;
}) {
  const [openTxn, setOpenTxn] = React.useState<string | null>(null);
  if (!txns.length) {
    return (
      <p className="text-ink-muted text-sm">
        No transactions were extracted from this statement. The PDF might be a
        scan or use an unusual layout — your dashboard will tell you more.
      </p>
    );
  }
  return (
    <>
      <div className="rounded-2xl bg-paper-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper-warm/60 text-ink-muted">
            <tr>
              <th className="text-left font-normal px-5 py-3">Date</th>
              <th className="text-left font-normal px-5 py-3">Merchant</th>
              <th className="text-left font-normal px-5 py-3 hidden md:table-cell">Category</th>
              <th className="text-right font-normal px-5 py-3">Amount</th>
              {jobId ? <th className="px-5 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-t border-ink/6">
                <td className="px-5 py-3 text-ink-muted whitespace-nowrap">
                  {fmtDate(t.txn_date)}
                </td>
                <td className="px-5 py-3 text-ink">
                  {t.merchant_norm || t.merchant_raw}
                </td>
                <td className="px-5 py-3 hidden md:table-cell">
                  <span className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                    {t.category}
                  </span>
                </td>
                <td
                  className={`px-5 py-3 text-right font-display ${
                    t.is_debit ? "text-ink" : "text-accent-ink"
                  }`}
                >
                  {t.is_debit ? "" : "+ "}{inr(t.amount)}
                </td>
                {jobId ? (
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setOpenTxn(t.id)}
                      className="inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink"
                      aria-label="Open Resolution Assistant"
                    >
                      <ShieldAlert size={12} /> Resolve
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {jobId && openTxn ? (
        <ResolutionModal
          jobId={jobId}
          txnId={openTxn}
          open={!!openTxn}
          onClose={() => setOpenTxn(null)}
        />
      ) : null}
    </>
  );
}
