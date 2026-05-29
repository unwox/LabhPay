"use client";

/**
 * Blocking consent / disclaimer gate. Shown to a logged-in user whose
 * recorded consent is missing or out of date (auth-context exposes
 * `consent_required`). The user must give an explicit, affirmative
 * acknowledgement before they can proceed; acceptance is recorded server-side
 * with full audit context (IP, user-agent, session id, version, timestamp).
 *
 * Keep the disclaimer text in sync with CONSENT_VERSION in the backend
 * (app/core/config.py). Bump both together when the terms change.
 */

import * as React from "react";
import { ShieldCheck, AlertTriangle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { acceptConsent, ApiError } from "@/lib/api";

export function ConsentGate() {
  const { user, refresh } = useAuth();
  const [checked, setChecked] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Only gate logged-in users who still need to consent.
  if (!user || !user.consent_required) return null;

  async function onAccept() {
    if (!checked || busy) return;
    setBusy(true);
    setError(null);
    try {
      await acceptConsent({ terms: true, privacy: true, disclaimer: true });
      await refresh(); // clears consent_required → gate disappears
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't record consent. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/55 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-paper-card shadow-card-xl p-6 md:p-8 my-auto">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-mist text-accent-ink">
          <ShieldCheck size={20} strokeWidth={1.75} />
        </span>
        <h2 className="mt-5 font-display text-2xl md:text-3xl text-ink">
          Before you continue.
        </h2>
        <p className="mt-2 text-[15px] text-ink-soft leading-relaxed">
          Please review and accept the following. Your acceptance is recorded
          for compliance, along with the date, your IP address and session.
        </p>

        <div className="mt-5 space-y-3">
          <Point
            icon={AlertTriangle}
            title="Not financial advice"
            body="LabhPay provides informational insights about your statements only. It is not financial, investment, tax, or legal advice. Decisions you make are your own."
          />
          <Point
            icon={ShieldCheck}
            title="How your data is handled"
            body="You authorise LabhPay to process the statements you upload to generate insights. Statements are processed in memory, encrypted in transit, and auto-deleted after your session. No training on your data, no resale."
          />
        </div>

        <label className="mt-6 flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-ink/30 accent-accent"
          />
          <span className="text-[14px] text-ink leading-relaxed">
            I have read and agree to LabhPay&rsquo;s{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="underline underline-offset-4 text-accent-ink"
            >
              Privacy Promise
            </Link>{" "}
            and understand that LabhPay does not provide financial advice.
          </span>
        </label>

        {error ? (
          <p className="mt-4 text-sm text-ink-soft bg-paper-warm p-3 rounded-xl">
            {error}
          </p>
        ) : null}

        <Button
          variant="primary"
          size="lg"
          className="w-full mt-6"
          disabled={!checked || busy}
          onClick={onAccept}
        >
          {busy ? "Recording…" : "Agree & continue"}
        </Button>

        <p className="mt-4 text-xs text-ink-muted text-center">
          You can review the full privacy details any time at labhpay.com/privacy.
        </p>
      </div>
    </div>
  );
}

function Point({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-paper-warm/60 p-4">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-paper-card text-accent-ink shrink-0">
        <Icon size={15} strokeWidth={1.75} />
      </span>
      <div>
        <p className="font-display text-[15px] text-ink leading-tight">{title}</p>
        <p className="mt-1 text-[13px] text-ink-soft leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
