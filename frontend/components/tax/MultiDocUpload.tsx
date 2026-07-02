"use client";

import * as React from "react";
import Link from "next/link";
import {
  Upload,
  Loader2,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ArrowRight,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  extractForm16,
  mergeForm16Fields,
  ApiError,
  type Form16Fields,
} from "@/lib/api";

type Doc = {
  id: string;
  name: string;
  status: "reading" | "done" | "needpw" | "error";
  fields?: Form16Fields;
  error?: string;
  file?: File;
};

const SUGGESTED = [
  "Form 16 (Part A & B)",
  "Salary slip / payslip",
  "Form 12BA (perquisites)",
  "Form 26AS",
  "AIS",
];

/** Human labels for the non-zero fields a document contributed. */
function foundLabels(f: Form16Fields): string[] {
  const map: [keyof Form16Fields, string][] = [
    ["gross_salary", "salary"],
    ["tds", "TDS"],
    ["nps_employer_80ccd2", "employer NPS"],
    ["ded_80c", "80C"],
    ["ded_80d", "80D"],
    ["nps_80ccd1b", "NPS 80CCD(1B)"],
    ["hra_exempt", "HRA"],
    ["lta_exempt", "LTA/LTC"],
    ["home_loan_interest", "home loan"],
    ["other_income", "other income"],
    ["capital_gains", "capital gains"],
    ["other_deductions", "other deductions"],
  ];
  return map.filter(([k]) => (f[k] || 0) > 0).map(([, l]) => l);
}

export function MultiDocUpload({
  loggedIn,
  onMerged,
}: {
  loggedIn: boolean;
  onMerged: (fields: Form16Fields, docCount: number) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [docs, setDocs] = React.useState<Doc[]>([]);
  const [pw, setPw] = React.useState<Record<string, string>>({});

  // Re-merge and report whenever the set of successfully-read docs changes.
  const remerge = React.useCallback((all: Doc[]) => {
    const done = all.filter((d) => d.status === "done" && d.fields);
    if (done.length) onMerged(mergeForm16Fields(done.map((d) => d.fields!)), done.length);
  }, [onMerged]);

  function update(id: string, patch: Partial<Doc>) {
    setDocs((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, ...patch } : d));
      remerge(next);
      return next;
    });
  }

  async function read(id: string, file: File, password?: string) {
    update(id, { status: "reading", error: undefined });
    try {
      const fields = await extractForm16(file, password);
      update(id, { status: "done", fields, file: undefined });
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && /password/i.test(e.detail)) {
        update(id, { status: "needpw", file });
      } else {
        update(id, {
          status: "error",
          error: e instanceof ApiError ? e.detail : "Couldn't read this file.",
        });
      }
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newDocs: Doc[] = Array.from(files).map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      status: "reading" as const,
      file: f,
    }));
    setDocs((prev) => [...prev, ...newDocs]);
    newDocs.forEach((d) => read(d.id, d.file!));
  }

  function removeDoc(id: string) {
    setDocs((prev) => {
      const next = prev.filter((d) => d.id !== id);
      remerge(next);
      return next;
    });
  }

  if (!loggedIn) {
    return (
      <Card elevation="md" tone="mist" className="p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-paper-card text-accent-ink">
            <Upload size={18} />
          </span>
          <div>
            <p className="font-display text-lg text-ink">Auto-fill from your documents</p>
            <p className="text-ink-soft text-sm">
              Sign in to upload your Form 16, payslip and other tax documents — we read them all.
            </p>
          </div>
        </div>
        <Link href="/login?next=/tax">
          <Button variant="primary" size="sm">
            Sign in <ArrowRight size={14} className="ml-1.5" />
          </Button>
        </Link>
      </Card>
    );
  }

  const doneCount = docs.filter((d) => d.status === "done").length;

  return (
    <Card elevation="md" tone="mist" className="p-5 md:p-6">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="sr-only"
        onChange={(e) => addFiles(e.target.files)}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-display text-lg text-ink">
            {doneCount
              ? `Read ${doneCount} document${doneCount === 1 ? "" : "s"} — review the numbers below`
              : "Upload your tax documents"}
          </p>
          <p className="text-ink-soft text-sm mt-0.5">
            Add as many as you have — we combine them for the full picture. Read securely, never stored.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload size={14} className="mr-1.5" /> Add documents
        </Button>
      </div>

      {/* Suggested documents */}
      {docs.length === 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <span key={s} className="text-[12px] rounded-full border border-ink/12 px-2.5 py-1 text-ink-soft">
              {s}
            </span>
          ))}
        </div>
      ) : null}

      {/* Uploaded docs list */}
      {docs.length ? (
        <ul className="mt-4 space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="rounded-2xl bg-paper-card p-3.5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-paper-warm text-ink-soft shrink-0">
                  {d.status === "reading" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : d.status === "done" ? (
                    <CheckCircle2 size={15} className="text-accent-ink" />
                  ) : d.status === "error" ? (
                    <AlertTriangle size={15} className="text-amber-600" />
                  ) : (
                    <FileText size={15} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ink text-sm truncate">{d.name}</p>
                  {d.status === "done" && d.fields ? (
                    <p className="text-[12px] text-ink-muted truncate">
                      Found: {foundLabels(d.fields).join(", ") || "nothing usable"}
                    </p>
                  ) : d.status === "reading" ? (
                    <p className="text-[12px] text-ink-muted">Reading…</p>
                  ) : d.status === "error" ? (
                    <p className="text-[12px] text-amber-700">{d.error}</p>
                  ) : (
                    <p className="text-[12px] text-ink-muted">Password needed</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeDoc(d.id)}
                  aria-label="Remove"
                  className="h-7 w-7 grid place-items-center rounded-full hover:bg-paper-warm text-ink-muted shrink-0"
                >
                  <X size={14} />
                </button>
              </div>

              {d.status === "needpw" ? (
                <form
                  className="mt-2.5 flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (d.file && pw[d.id]) read(d.id, d.file, pw[d.id]);
                  }}
                >
                  <input
                    type="password"
                    value={pw[d.id] || ""}
                    onChange={(e) => setPw((p) => ({ ...p, [d.id]: e.target.value }))}
                    placeholder="Password (often PAN + DOB)"
                    className="h-9 flex-1 min-w-[160px] rounded-lg border border-ink/12 bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <Button type="submit" variant="primary" size="sm" disabled={!pw[d.id]}>
                    Unlock
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
