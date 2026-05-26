"use client";

/**
 * Stage 10 — Public privacy banner.
 *
 * Pins to the bottom of the viewport on every page until the user
 * dismisses it. The dismissal is stored in localStorage so it doesn't
 * harass returning users. We deliberately don't use a cookie — this is
 * a privacy banner, ironically the wrong place to drop a tracking cookie.
 */

import * as React from "react";
import { ShieldCheck, X } from "lucide-react";

const STORAGE_KEY = "lp-privacy-banner-dismissed-v1";

export function PrivacyBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined" && !window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-label="Privacy notice"
      className="fixed inset-x-2 bottom-2 z-30 sm:inset-x-4 sm:bottom-4"
    >
      <div className="mx-auto max-w-3xl rounded-2xl bg-paper-card shadow-card-lg border border-ink/10 px-4 py-3 sm:px-5 sm:py-4 flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-mist text-accent-ink shrink-0">
          <ShieldCheck size={16} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-[15px] text-ink leading-tight">
            Your statements are processed securely and automatically deleted
            after your session ends.
          </p>
          <p className="mt-1 text-[12px] text-ink-muted">
            We never train on your data. No advertising. No resale.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss privacy notice"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-accent-mist hover:text-ink"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
