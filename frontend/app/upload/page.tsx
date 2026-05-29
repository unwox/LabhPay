"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, FileText, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/upload/Dropzone";
import { PasswordModal } from "@/components/upload/PasswordModal";
import {
  ApiError,
  submitStatementPassword,
  uploadStatement,
} from "@/lib/api";

type Pending = {
  jobId: string;
  filename: string;
};

function fmtSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function UploadPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadPct, setUploadPct] = React.useState(0);
  const [uploadFile, setUploadFile] = React.useState<{ name: string; size: number } | null>(null);
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [pwBusy, setPwBusy] = React.useState(false);
  const [pwError, setPwError] = React.useState<string | null>(null);

  async function handleFiles(files: File[]) {
    setError(null);
    setUploading(true);
    setUploadPct(0);
    const file = files[0];
    setUploadFile({ name: file.name, size: file.size });
    try {
      const { job_id, filename, needs_password } = await uploadStatement(file, {
        onProgress: (pct) => setUploadPct(pct),
      });
      if (needs_password) {
        setPending({ jobId: job_id, filename });
        setUploading(false);
      } else {
        // Keep the indicator up through navigation so there's no blank gap.
        router.push(`/upload/${job_id}`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Upload failed.");
      setUploading(false);
      setUploadFile(null);
    }
  }

  // Bytes still in flight vs. server saving/encrypting after 100% sent.
  const finishing = uploading && uploadPct >= 100;

  async function handlePassword(pw: string) {
    if (!pending) return;
    setPwBusy(true);
    setPwError(null);
    try {
      await submitStatementPassword(pending.jobId, pw);
      const id = pending.jobId;
      setPending(null);
      router.push(`/upload/${id}`);
    } catch (e) {
      setPwError(e instanceof ApiError ? e.detail : "Couldn't unlock.");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-ivory-fade">
      <header className="px-[var(--site-gutter)] py-5 md:py-7 flex items-center justify-between max-w-site mx-auto">
        <Link href="/" aria-label="LabhPay home">
          <Logo size="md" />
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            Dashboard
          </Button>
        </Link>
      </header>

      <section className="px-[var(--site-gutter)] py-12 md:py-16 max-w-3xl mx-auto">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
          Upload
        </p>
        <h1 className="mt-3 font-display text-display-sm md:text-display-md text-ink">
          Your statement, decoded.
        </h1>
        <p className="mt-3 text-ink-soft max-w-prose">
          We&rsquo;ll read your PDF, identify your bank, and surface what
          matters. Processed in memory, encrypted in transit, auto-deleted
          after your session.
        </p>

        <div className="mt-8">
          {uploading && uploadFile ? (
            <Card elevation="md" className="p-6 md:p-7">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-mist text-accent-ink shrink-0">
                  {finishing ? (
                    <CheckCircle2 size={22} />
                  ) : (
                    <FileText size={22} strokeWidth={1.75} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate font-medium">{uploadFile.name}</p>
                  <p className="text-xs text-ink-muted">
                    {fmtSize(uploadFile.size)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm text-ink-soft tabular-nums">
                  <Loader2 size={15} className="animate-spin text-accent-ink" />
                  {finishing ? "Finishing…" : `${uploadPct}%`}
                </span>
              </div>

              {/* Progress bar — determinate while sending, indeterminate while
                  the server saves & encrypts the file. */}
              <div className="mt-5 h-2 w-full rounded-full bg-paper-warm overflow-hidden">
                {finishing ? (
                  <div className="h-full w-1/3 rounded-full bg-accent animate-indeterminate" />
                ) : (
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-200"
                    style={{ width: `${uploadPct}%` }}
                  />
                )}
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                {finishing
                  ? "Securing your file and queuing it for analysis…"
                  : "Uploading your statement securely…"}
              </p>
            </Card>
          ) : (
            <Dropzone onFiles={handleFiles} disabled={uploading} />
          )}
        </div>

        {error ? (
          <Card elevation="sm" className="mt-6 p-5">
            <p className="text-ink-soft">{error}</p>
          </Card>
        ) : null}

        <div className="mt-12 grid md:grid-cols-3 gap-4 md:gap-6 text-sm">
          <Tip title="Any major Indian bank">
            HDFC, SBI, ICICI today. Axis, Kotak, AU, OneCard, IndusInd, RBL,
            Amex, BoB landing next.
          </Tip>
          <Tip title="Password-protected? Fine.">
            We&rsquo;ll ask for the password securely. It&rsquo;s used once and
            deleted immediately.
          </Tip>
          <Tip title="Your data stays yours">
            No training. No advertising. No resale. Auto-deleted at logout.
          </Tip>
        </div>
      </section>

      <PasswordModal
        open={!!pending}
        filename={pending?.filename || ""}
        busy={pwBusy}
        error={pwError}
        onSubmit={handlePassword}
        onCancel={() => {
          setPending(null);
          setPwError(null);
        }}
      />
    </main>
  );
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-paper-card p-5 shadow-card-sm">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-1 text-ink-soft leading-relaxed">{children}</p>
    </div>
  );
}
