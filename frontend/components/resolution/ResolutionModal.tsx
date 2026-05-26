"use client";

/**
 * Stage 9 — Resolution Assistant modal.
 *
 * Flow:
 *   1. Open with a (jobId, txnId).
 *   2. Fetch applicable actions + per-action recipient hints.
 *   3. User picks an action → fetch the drafted email.
 *   4. User can: Copy · mailto: · regenerate in Hindi · re-pick action · close.
 *
 * The component is presentation-only; the backend already handles
 * recipient resolution, language, and prefilled fields.
 */

import * as React from "react";
import { X, Copy, Mail, Languages, ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  draftResolutionEmail,
  getResolutionActions,
  ApiError,
  type ResolutionAction,
  type ResolutionActionsResp,
  type ResolutionEmail,
  type ResolutionRecipient,
} from "@/lib/api";

type Lang = "en" | "hi";

export function ResolutionModal({
  jobId,
  txnId,
  open,
  onClose,
}: {
  jobId: string;
  txnId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = React.useState<"actions" | "email">("actions");
  const [data, setData] = React.useState<ResolutionActionsResp | null>(null);
  const [email, setEmail] = React.useState<ResolutionEmail | null>(null);
  const [lang, setLang] = React.useState<Lang>("en");
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Load actions when modal opens.
  React.useEffect(() => {
    if (!open) return;
    setStep("actions");
    setEmail(null);
    setActionId(null);
    setError(null);
    setBusy(true);
    getResolutionActions(jobId, txnId)
      .then((r) => setData(r))
      .catch((e) => setError(e instanceof ApiError ? e.detail : String(e)))
      .finally(() => setBusy(false));
  }, [open, jobId, txnId]);

  // ESC to close.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function pickAction(a: ResolutionAction, useLang: Lang = lang) {
    setBusy(true);
    setError(null);
    setActionId(a.id);
    try {
      const e = await draftResolutionEmail({
        job_id: jobId,
        txn_id: txnId,
        action_id: a.id,
        language: useLang,
      });
      setEmail(e);
      setStep("email");
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleLang() {
    if (!actionId || !data) return;
    const next: Lang = lang === "en" ? "hi" : "en";
    setLang(next);
    const a = data.actions.find((x) => x.id === actionId);
    if (a) await pickAction(a, next);
  }

  async function copyEmail() {
    if (!email) return;
    const text = `Subject: ${email.subject}\n\n${email.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* silent */
    }
  }

  function mailtoHref(): string {
    if (!email) return "#";
    const to = email.recipient_email || "";
    const cc = email.secondary_email || "";
    const params = new URLSearchParams({
      subject: email.subject,
      body: email.body,
    });
    if (cc) params.set("cc", cc);
    return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
  }

  if (!open) return null;

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-50 bg-ink/40"
      />
      <div
        role="dialog"
        aria-label="Resolution Assistant"
        className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4 pointer-events-none"
      >
        <div className="pointer-events-auto bg-paper-card sm:rounded-3xl rounded-t-3xl shadow-card-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between p-4 sm:p-5 border-b border-ink/8">
            <div className="flex items-center gap-3">
              {step === "email" ? (
                <button
                  type="button"
                  onClick={() => setStep("actions")}
                  aria-label="Back to actions"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-accent-mist"
                >
                  <ArrowLeft size={16} strokeWidth={1.75} />
                </button>
              ) : (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-mist text-accent-ink">
                  <ShieldAlert size={16} strokeWidth={1.75} />
                </span>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                  Resolution Assistant
                </p>
                <p className="font-display text-lg text-ink leading-tight">
                  {step === "actions"
                    ? "Pick what you want to do."
                    : "Your draft email."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-accent-mist"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </header>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {busy ? (
              <p className="text-ink-muted text-sm">Loading…</p>
            ) : error ? (
              <p className="text-sm text-ink-soft bg-paper-warm rounded-2xl p-4">
                {error}
              </p>
            ) : step === "actions" && data ? (
              <ActionsView data={data} lang={lang} onPick={pickAction} />
            ) : email ? (
              <EmailView
                email={email}
                lang={lang}
                onToggleLang={toggleLang}
                onCopy={copyEmail}
                mailtoHref={mailtoHref()}
                copied={copied}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function ActionsView({
  data,
  lang,
  onPick,
}: {
  data: ResolutionActionsResp;
  lang: Lang;
  onPick: (a: ResolutionAction) => void;
}) {
  const recipientOf = (id: string): ResolutionRecipient | undefined =>
    data.recipients.find((r) => r.action_id === id);
  return (
    <>
      <div className="rounded-2xl bg-paper-warm p-4">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
          Transaction
        </p>
        <p className="mt-1 font-display text-base text-ink truncate">
          {data.txn.merchant} · ₹{data.txn.amount.toLocaleString("en-IN")}
        </p>
        <p className="text-xs text-ink-muted">
          {data.txn.date}
          {data.txn.is_emi ? " · EMI" : ""}
          {data.txn.has_duplicate ? " · possible duplicate" : ""}
        </p>
      </div>

      <ul className="space-y-2">
        {data.actions.map((a) => {
          const r = recipientOf(a.id);
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onPick(a)}
                className="w-full text-left rounded-2xl border border-ink/12 bg-paper p-4 hover:border-accent hover:bg-accent-mist/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-[15px] text-ink">
                    {lang === "en" ? a.label_en : a.label_hi}
                  </p>
                  <span className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                    {a.recipient === "bank" ? "→ bank" : "→ merchant"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-ink-soft">
                  {lang === "en" ? a.blurb_en : a.blurb_hi}
                </p>
                {r?.name ? (
                  <p className="mt-2 text-[12px] text-ink-muted">
                    {r.name}{r.email ? ` · ${r.email}` : " · email TBD"}
                    {r.expected_sla ? ` · ${r.expected_sla}` : ""}
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function EmailView({
  email,
  lang,
  onToggleLang,
  onCopy,
  mailtoHref,
  copied,
}: {
  email: ResolutionEmail;
  lang: Lang;
  onToggleLang: () => void;
  onCopy: () => void;
  mailtoHref: string;
  copied: boolean;
}) {
  return (
    <>
      <div className="rounded-2xl bg-paper-warm p-4">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
          To
        </p>
        <p className="mt-1 font-display text-[15px] text-ink">
          {email.recipient_name} ·{" "}
          <span className="text-ink-soft text-[13px] font-sans">
            {email.recipient_email || "no email on file"}
          </span>
        </p>
        {email.secondary_email ? (
          <p className="text-[12px] text-ink-muted">
            cc: {email.secondary_email}
          </p>
        ) : null}
        {email.expected_sla ? (
          <p className="mt-1 text-[12px] text-ink-muted">
            Expected first response: {email.expected_sla}.
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
          Subject
        </p>
        <p className="mt-1 font-display text-[15px] text-ink">{email.subject}</p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
          Body
        </p>
        <pre className="mt-1 whitespace-pre-wrap font-sans text-[14px] text-ink bg-paper rounded-2xl border border-ink/8 p-4 leading-relaxed">
{email.body}
        </pre>
      </div>

      {email.notes.length ? (
        <ul className="text-[12px] text-ink-muted space-y-1">
          {email.notes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={onCopy}>
          <Copy size={14} strokeWidth={1.75} />
          {copied ? "Copied" : "Copy"}
        </Button>
        <a
          href={mailtoHref}
          className="inline-flex items-center justify-center gap-2 rounded-full h-9 px-4 text-[13px] font-medium bg-accent text-paper hover:bg-accent-ink"
        >
          <Mail size={14} strokeWidth={1.75} /> Open in mail
        </a>
        <Button variant="outline" size="sm" onClick={onToggleLang}>
          <Languages size={14} strokeWidth={1.75} />
          {lang === "en" ? "हिंदी" : "English"}
        </Button>
      </div>
    </>
  );
}
