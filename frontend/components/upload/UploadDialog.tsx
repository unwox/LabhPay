"use client";

/**
 * In-place upload modal. Lets the user pick + upload a statement from
 * wherever they are (dashboard, empty state, landing CTA) without navigating
 * to a separate page first. On success it goes straight to the processing
 * screen (/upload/[jobId]). This removes the old standalone /upload step from
 * the happy path.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, FileText, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dropzone } from "@/components/upload/Dropzone";
import { PasswordModal } from "@/components/upload/PasswordModal";
import { ApiError, submitStatementPassword, uploadStatement } from "@/lib/api";

function fmtSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function UploadDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadPct, setUploadPct] = React.useState(0);
  const [uploadFile, setUploadFile] = React.useState<{ name: string; size: number } | null>(null);
  const [pending, setPending] = React.useState<{ jobId: string; filename: string } | null>(null);
  const [pwBusy, setPwBusy] = React.useState(false);
  const [pwError, setPwError] = React.useState<string | null>(null);

  // Reset transient state whenever the dialog is closed.
  React.useEffect(() => {
    if (!open) {
      setError(null);
      setUploading(false);
      setUploadPct(0);
      setUploadFile(null);
      setPending(null);
      setPwError(null);
    }
  }, [open]);

  // Esc to close (only when not mid-upload).
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !uploading) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, uploading, onClose]);

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
        router.push(`/upload/${job_id}`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Upload failed.");
      setUploading(false);
      setUploadFile(null);
    }
  }

  async function handlePassword(pw: string) {
    if (!pending) return;
    setPwBusy(true);
    setPwError(null);
    try {
      await submitStatementPassword(pending.jobId, pw);
      const id = pending.jobId;
      router.push(`/upload/${id}`);
    } catch (e) {
      setPwError(e instanceof ApiError ? e.detail : "Couldn't unlock.");
    } finally {
      setPwBusy(false);
    }
  }

  if (!open) return null;

  const finishing = uploading && uploadPct >= 100;

  return (
    <>
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-sm px-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !uploading) onClose();
        }}
      >
        <div className="relative w-full max-w-xl rounded-3xl bg-paper-card shadow-card-xl p-6 md:p-8">
          {!uploading ? (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-4 top-4 h-9 w-9 grid place-items-center rounded-full hover:bg-paper-warm text-ink-muted"
            >
              <X size={16} />
            </button>
          ) : null}

          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            Upload
          </p>
          <h2 className="mt-2 font-display text-2xl md:text-3xl text-ink">
            Add a statement.
          </h2>
          <p className="mt-2 text-[15px] text-ink-soft">
            PDF, up to 15 MB. Password-protected files are supported. Processed
            in memory and auto-deleted after your session.
          </p>

          <div className="mt-6">
            {uploading && uploadFile ? (
              <Card elevation="sm" className="p-5">
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-mist text-accent-ink shrink-0">
                    {finishing ? <CheckCircle2 size={20} /> : <FileText size={20} strokeWidth={1.75} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink truncate font-medium">{uploadFile.name}</p>
                    <p className="text-xs text-ink-muted">{fmtSize(uploadFile.size)}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm text-ink-soft tabular-nums">
                    <Loader2 size={15} className="animate-spin text-accent-ink" />
                    {finishing ? "Finishing…" : `${uploadPct}%`}
                  </span>
                </div>
                <div className="mt-4 h-2 w-full rounded-full bg-paper-warm overflow-hidden">
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
              <Dropzone onFiles={handleFiles} />
            )}
          </div>

          {error ? (
            <p className="mt-4 text-sm text-ink-soft bg-paper-warm p-3 rounded-xl">
              {error}
            </p>
          ) : null}

          <p className="mt-6 inline-flex items-center gap-2 text-xs text-ink-muted">
            <ShieldCheck size={13} /> No training. No resale. Deleted at logout.
          </p>
        </div>
      </div>

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
    </>
  );
}
