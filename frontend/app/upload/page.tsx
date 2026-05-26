"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function UploadPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [pwBusy, setPwBusy] = React.useState(false);
  const [pwError, setPwError] = React.useState<string | null>(null);

  async function handleFiles(files: File[]) {
    setError(null);
    setUploading(true);
    try {
      // For Stage 4 we process one file at a time. Multi-file shows
      // a list in future stages.
      const file = files[0];
      const { job_id, filename, needs_password } = await uploadStatement(file);
      if (needs_password) {
        setPending({ jobId: job_id, filename });
      } else {
        router.push(`/upload/${job_id}`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

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
          <Dropzone onFiles={handleFiles} disabled={uploading} />
        </div>

        {uploading ? (
          <p className="mt-4 text-sm text-ink-muted">Uploading…</p>
        ) : null}
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
