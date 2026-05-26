"use client";

import * as React from "react";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PasswordModal({
  open,
  filename,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  filename: string;
  busy: boolean;
  error: string | null;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}) {
  const [pw, setPw] = React.useState("");
  React.useEffect(() => {
    if (!open) setPw("");
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-sm px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-paper-card shadow-card-xl p-6 md:p-8">
        <button
          type="button"
          aria-label="Close"
          onClick={onCancel}
          className="absolute right-4 top-4 h-9 w-9 grid place-items-center rounded-full hover:bg-paper-warm text-ink-muted"
        >
          <X size={16} />
        </button>

        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-mist text-accent-ink">
          <Lock size={18} strokeWidth={1.75} />
        </span>
        <h2 className="mt-5 font-display text-2xl text-ink">
          This statement is locked.
        </h2>
        <p className="mt-2 text-[15px] text-ink-soft leading-relaxed">
          Enter the password for{" "}
          <span className="font-mono text-ink">{filename}</span>. Indian banks
          usually use a combination of your name, date of birth, or card
          number — check the email that delivered this statement.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pw && !busy) onSubmit(pw);
          }}
          className="mt-6 space-y-4"
        >
          <input
            type="password"
            value={pw}
            autoFocus
            onChange={(e) => setPw(e.target.value)}
            placeholder="Statement password"
            className="w-full h-12 rounded-xl border border-ink/12 bg-paper px-4 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            maxLength={64}
          />
          {error ? (
            <p className="text-sm text-ink-soft bg-paper-warm p-3 rounded-xl">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-ink-soft hover:text-ink"
            >
              Use a different file
            </button>
            <Button type="submit" variant="primary" disabled={!pw || busy}>
              {busy ? "Unlocking…" : "Unlock"}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-xs text-ink-muted">
          The password is encrypted with your session key, used once, and
          deleted from our cache immediately after.
        </p>
      </div>
    </div>
  );
}
