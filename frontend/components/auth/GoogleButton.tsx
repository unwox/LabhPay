"use client";

/**
 * Stage 10.1 — "Continue with Google" button.
 *
 * Loads Google Identity Services on demand and renders the official
 * Google button into a host div. On a successful credential callback we
 * POST the id_token to /auth/google and let the parent decide what to
 * do next (typically: refresh() + router.replace(next)).
 *
 * The button is a no-op visually when NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't
 * set — useful so /login still works in environments without Google
 * configured (e.g. local dev without keys).
 */

import * as React from "react";
import { signInWithGoogle, ApiError } from "@/lib/api";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GSI_SRC = "https://accounts.google.com/gsi/client";

// Minimal type for the global google.accounts.id namespace.
type GsiNamespace = {
  initialize: (opts: {
    client_id: string;
    callback: (resp: { credential: string }) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
  }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
  prompt: () => void;
  cancel: () => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GsiNamespace } };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gsi script failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gsi script failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function GoogleButton({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError?: (err: string) => void;
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !hostRef.current || !window.google) return;
        const ns = window.google.accounts.id;
        ns.initialize({
          client_id: CLIENT_ID,
          callback: async (resp) => {
            if (!resp.credential) return;
            setBusy(true);
            try {
              await signInWithGoogle(resp.credential);
              onSuccess();
            } catch (e) {
              const detail =
                e instanceof ApiError ? e.detail :
                e instanceof Error ? e.message : "Sign-in failed.";
              onError?.(detail);
            } finally {
              setBusy(false);
            }
          },
          ux_mode: "popup",
          auto_select: false,
        });
        ns.renderButton(hostRef.current, {
          type: "standard",
          theme: "outline",
          shape: "pill",
          size: "large",
          text: "continue_with",
          width: 320,
          logo_alignment: "left",
        });
        setReady(true);
      })
      .catch((e) => {
        if (cancelled) return;
        onError?.(`Could not load Google: ${e.message || e}`);
      });
    return () => {
      cancelled = true;
    };
  }, [onSuccess, onError]);

  if (!CLIENT_ID) {
    // Quietly hide — useful in dev. The phone-OTP path is always available.
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={hostRef}
        className="min-h-[44px]"
        aria-label="Continue with Google"
      />
      {!ready ? (
        <p className="text-[12px] text-ink-muted">Loading Google…</p>
      ) : null}
      {busy ? (
        <p className="text-[12px] text-ink-muted">Verifying with Google…</p>
      ) : null}
      <div className="flex items-center w-full gap-3 text-[11px] uppercase tracking-eyebrow text-ink-muted">
        <span className="h-px flex-1 bg-ink/10" />
        or
        <span className="h-px flex-1 bg-ink/10" />
      </div>
    </div>
  );
}
