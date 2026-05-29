"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressStages } from "@/components/upload/ProgressStages";
import { PasswordModal } from "@/components/upload/PasswordModal";
import {
  StatementHeader,
  TransactionsTable,
} from "@/components/upload/TransactionsTable";
import {
  ApiError,
  deleteStatementJob,
  getStatementResult,
  getStatementStatus,
  submitStatementPassword,
  type ApiStatementMeta,
  type ApiTxn,
  type JobStatus,
} from "@/lib/api";

const POLL_INTERVAL = 1200;
const TERMINAL = new Set(["done", "failed", "needs_password"]);

export default function JobPage() {
  const router = useRouter();
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  const [status, setStatus] = React.useState<JobStatus | null>(null);
  const [meta, setMeta] = React.useState<ApiStatementMeta | null>(null);
  const [txns, setTxns] = React.useState<ApiTxn[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pwOpen, setPwOpen] = React.useState(false);
  const [pwBusy, setPwBusy] = React.useState(false);
  const [pwError, setPwError] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);

  // Poll status until terminal, then fetch result.
  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const s = await getStatementStatus(jobId);
        if (cancelled) return;
        setStatus(s);
        if (s.stage === "needs_password") {
          setPwOpen(true);
          return;
        }
        if (s.stage === "failed") {
          setError(s.error || "Something went wrong while reading this PDF.");
          return;
        }
        if (s.stage === "done") {
          const r = await getStatementResult(jobId);
          if (cancelled) return;
          setMeta(r.statement.meta);
          setTxns(r.statement.transactions);
          return;
        }
        timer = setTimeout(tick, POLL_INTERVAL);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          router.replace(`/login?next=/upload/${jobId}`);
          return;
        }
        if (!cancelled) {
          setError(e instanceof ApiError ? e.detail : "Couldn't check status.");
        }
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, router]);

  async function handlePassword(pw: string) {
    setPwBusy(true);
    setPwError(null);
    try {
      await submitStatementPassword(jobId, pw);
      setPwOpen(false);
      setStatus((s) => (s ? { ...s, stage: "queued", progress: 0.05 } : s));
    } catch (e) {
      setPwError(e instanceof ApiError ? e.detail : "Couldn't unlock.");
    } finally {
      setPwBusy(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteStatementJob(jobId);
    } finally {
      router.replace("/upload");
    }
  }

  const stage = status?.stage ?? "queued";
  const processing = !["done", "failed", "needs_password"].includes(stage);

  // Count seconds elapsed while processing, to reassure the app is alive.
  React.useEffect(() => {
    if (!processing) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [processing]);

  const pct = Math.round((status?.progress ?? 0) * 100);

  return (
    <main className="min-h-screen bg-ivory-fade">
      <header className="px-[var(--site-gutter)] py-5 md:py-7 flex items-center justify-between max-w-site mx-auto">
        <Link href="/" aria-label="LabhPay home">
          <Logo size="md" />
        </Link>
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="primary" size="sm">
              Open dashboard
            </Button>
          </Link>
          <Link href="/upload">
            <Button variant="ghost" size="sm">
              Another statement
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            Delete this analysis
          </Button>
        </div>
      </header>

      <section className="px-[var(--site-gutter)] py-10 md:py-14 max-w-4xl mx-auto space-y-8">
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            {status?.bank_display || "Reading your statement"}
          </p>
          <h1 className="mt-3 font-display text-display-sm md:text-display-md text-ink">
            {stage === "done"
              ? "Here's what we found."
              : stage === "failed"
              ? "We hit a snag."
              : "Working on it…"}
          </h1>
          {status?.message ? (
            <p className="mt-3 text-ink-soft">{status.message}</p>
          ) : null}
        </div>

        <Card elevation="md" className="p-5 md:p-6">
          {processing ? (
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="inline-flex items-center gap-2 text-sm text-ink">
                <Loader2 size={16} className="animate-spin text-accent-ink" />
                Analyzing your statement…
              </span>
              <span className="text-sm text-ink-soft tabular-nums">{pct}%</span>
            </div>
          ) : null}

          <ProgressStages stage={stage} />

          <div className="mt-4 h-1.5 w-full rounded-full bg-paper-warm overflow-hidden">
            {processing && pct < 5 ? (
              // Job is queued / just started — show motion so it never looks frozen.
              <div className="h-full w-1/3 rounded-full bg-accent animate-indeterminate" />
            ) : (
              <div
                className="h-full bg-accent transition-[width] duration-500"
                style={{ width: `${stage === "done" ? 100 : pct}%` }}
              />
            )}
          </div>

          {processing ? (
            <p className="mt-3 text-xs text-ink-muted">
              {elapsed}s elapsed · this usually takes 15–30 seconds. You can
              keep this tab open.
            </p>
          ) : null}
        </Card>

        {error ? (
          <Card elevation="md" className="p-6">
            <p className="font-display text-xl text-ink">Couldn&rsquo;t read this one.</p>
            <p className="mt-2 text-ink-soft">{error}</p>
            <div className="mt-5 flex gap-3">
              <Link href="/upload">
                <Button variant="primary">Try another file</Button>
              </Link>
              <Button variant="outline" onClick={handleDelete}>
                Discard
              </Button>
            </div>
          </Card>
        ) : null}

        {meta && txns ? (
          <>
            <StatementHeader meta={meta} />
            <div>
              <h2 className="font-display text-2xl text-ink mb-3">
                Transactions
              </h2>
              <TransactionsTable txns={txns} jobId={jobId} />
              <p className="mt-4 text-xs text-ink-muted">
                {txns.length} transaction{txns.length === 1 ? "" : "s"} extracted ·
                Confidence {Math.round((meta.detection_confidence || 0) * 100)}% ·
                Pages {meta.pages}
              </p>
            </div>

            <Card elevation="md" tone="mist" className="p-6 md:p-8">
              <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                Your statement is ready
              </p>
              <h3 className="mt-2 font-display text-2xl md:text-3xl text-ink">
                See your spending intelligence
              </h3>
              <p className="mt-3 text-[15px] text-ink-soft leading-relaxed">
                Category breakdown, recurring subscriptions, hidden charges,
                EMI burden, top merchants — plus insights cards, suspicious-
                activity alerts, and the LabhPay Assistant to ask questions
                like &ldquo;how much on Swiggy?&rdquo; or &ldquo;which subscriptions can I
                cancel?&rdquo;.
              </p>
              <div className="mt-5 flex gap-3">
                <Link href="/dashboard">
                  <Button variant="primary" size="lg">
                    Open the dashboard →
                  </Button>
                </Link>
                <Link href="/upload">
                  <Button variant="outline" size="lg">
                    Upload another statement
                  </Button>
                </Link>
              </div>
            </Card>
          </>
        ) : null}
      </section>

      <PasswordModal
        open={pwOpen}
        filename="this statement"
        busy={pwBusy}
        error={pwError}
        onSubmit={handlePassword}
        onCancel={() => {
          setPwOpen(false);
        }}
      />
    </main>
  );
}
