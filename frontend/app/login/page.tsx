"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/card";
import { PhoneStep } from "@/components/auth/PhoneStep";
import { OtpStep } from "@/components/auth/OtpStep";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useAuth } from "@/lib/auth-context";

type Step = { kind: "phone" } | { kind: "otp"; phone: string; expiresInMinutes: number };

// useSearchParams() bails out of static prerendering — wrap the inner UI
// in a Suspense boundary so the page can be statically generated.
export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <main className="min-h-screen grid place-items-center">
          <p className="text-ink-muted text-sm">Loading…</p>
        </main>
      }
    >
      <LoginInner />
    </React.Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const { refresh } = useAuth();
  const [step, setStep] = React.useState<Step>({ kind: "phone" });
  const [googleError, setGoogleError] = React.useState<string | null>(null);

  async function onGoogleSuccess() {
    setGoogleError(null);
    await refresh();
    router.replace(next);
  }

  return (
    <main className="min-h-screen bg-ivory-fade flex flex-col">
      {/* Slim nav */}
      <header className="px-[var(--site-gutter)] py-5 md:py-7">
        <Link href="/" aria-label="LabhPay home">
          <Logo size="md" />
        </Link>
      </header>

      <section className="flex-1 grid place-items-center px-[var(--site-gutter)] pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
              {step.kind === "phone" ? "Sign in to LabhPay" : "One last step"}
            </p>
            <h1 className="mt-3 font-display text-display-sm md:text-4xl text-ink">
              {step.kind === "phone"
                ? "Welcome back."
                : "Verify your number."}
            </h1>
            <p className="mt-3 text-ink-soft">
              {step.kind === "phone"
                ? "We use WhatsApp OTP — no passwords to remember."
                : "Enter the 6-digit code from WhatsApp."}
            </p>
          </div>

          <Card elevation="lg" className="p-6 md:p-8">
            {step.kind === "phone" ? (
              <div className="space-y-5">
                <GoogleButton onSuccess={onGoogleSuccess} onError={setGoogleError} />
                {googleError ? (
                  <p className="text-[13px] text-ink-soft bg-paper-warm rounded-xl p-3">
                    {googleError}
                  </p>
                ) : null}
                <PhoneStep
                  onSent={(phone, expires) =>
                    setStep({ kind: "otp", phone, expiresInMinutes: expires })
                  }
                />
              </div>
            ) : (
              <OtpStep
                phone={step.phone}
                expiresInMinutes={step.expiresInMinutes}
                onChangePhone={() => setStep({ kind: "phone" })}
                onVerified={async () => {
                  await refresh();
                  router.replace(next);
                }}
              />
            )}
          </Card>

          <p className="mt-6 text-center text-xs text-ink-muted">
            By continuing you agree to LabhPay&rsquo;s{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              privacy promise
            </Link>
            . Your statements are auto-deleted after your session.
          </p>
        </div>
      </section>
    </main>
  );
}
