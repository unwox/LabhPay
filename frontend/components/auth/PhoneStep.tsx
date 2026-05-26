"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ApiError, requestOtp } from "@/lib/api";

export function PhoneStep({
  onSent,
}: {
  onSent: (phone: string, expiresInMinutes: number) => void;
}) {
  const [digits, setDigits] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const valid = /^[6-9]\d{9}$/.test(digits);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const phone = `+91${digits}`;
      const { expires_in_minutes } = await requestOtp(
        phone,
        firstName || undefined
      );
      onSent(phone, expires_in_minutes);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail
          : "Something went wrong. Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="firstName"
          className="text-[11px] uppercase tracking-eyebrow text-ink-muted"
        >
          Your name <span className="text-ink-faint">(optional)</span>
        </label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="So your OTP says hello"
          maxLength={40}
          className="w-full h-12 rounded-xl border border-ink/12 bg-paper-card px-4 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          autoComplete="given-name"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="phone"
          className="text-[11px] uppercase tracking-eyebrow text-ink-muted"
        >
          Mobile number
        </label>
        <div className="flex items-stretch h-12 rounded-xl border border-ink/12 bg-paper-card overflow-hidden focus-within:ring-2 focus-within:ring-accent focus-within:border-transparent">
          <span className="inline-flex items-center px-4 bg-paper-warm text-ink-soft text-base font-medium select-none">
            +91
          </span>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={digits}
            onChange={(e) =>
              setDigits(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="98XXXXXXXX"
            className="flex-1 px-4 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none tracking-wider"
          />
        </div>
        <p className="text-xs text-ink-muted">
          We&rsquo;ll send a 6-digit code on WhatsApp. No SMS spam, ever.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-paper-warm text-ink-soft text-sm p-3">
          {error}
        </div>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={!valid || busy}
        className="w-full"
      >
        {busy ? "Sending…" : "Send code"}
      </Button>
    </form>
  );
}
