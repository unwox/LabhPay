"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ApiError, requestOtp, verifyOtp } from "@/lib/api";

export function OtpStep({
  phone,
  expiresInMinutes,
  onVerified,
  onChangePhone,
}: {
  phone: string;
  expiresInMinutes: number;
  onVerified: () => void;
  onChangePhone: () => void;
}) {
  const [otp, setOtp] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = React.useState(30);
  const [resending, setResending] = React.useState(false);

  // Countdown for resend
  React.useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (otp.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(phone, otp);
      onVerified();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : "Couldn't verify the code."
      );
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await requestOtp(phone);
      setSecondsLeft(30);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Couldn't resend.");
    } finally {
      setResending(false);
    }
  }

  // Auto-submit when 6 digits are entered.
  React.useEffect(() => {
    if (otp.length === 6) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const masked = phone.replace(/(\+91)(\d{5})(\d{5})/, "$1 $2 $3");

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="otp"
          className="text-[11px] uppercase tracking-eyebrow text-ink-muted"
        >
          Verification code
        </label>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="• • • • • •"
          className="w-full h-16 rounded-xl border border-ink/12 bg-paper-card text-center text-3xl tracking-[0.5em] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-mono"
          autoFocus
        />
        <p className="text-xs text-ink-muted">
          Sent to {masked}. Code expires in {expiresInMinutes} minutes.
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
        disabled={otp.length !== 6 || busy}
        className="w-full"
      >
        {busy ? "Verifying…" : "Continue"}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onChangePhone}
          className="text-ink-soft hover:text-ink transition-colors"
        >
          Change number
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={secondsLeft > 0 || resending}
          className="text-ink-soft hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
