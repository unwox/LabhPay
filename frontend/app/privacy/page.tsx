import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Section, Eyebrow } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  Trash2,
  EyeOff,
  Database,
  Server,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Promise — Your Statements Are Auto-Deleted",
  description:
    "How LabhPay keeps your credit card statements private: processed in memory, encrypted with a session key, card number masked, and auto-deleted after your session. No training, no resale.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="relative">
      <Nav />

      {/* Hero */}
      <Section size="xl" bleed className="pt-32 md:pt-40 bg-ivory-fade">
        <div className="mx-auto max-w-site px-[var(--site-gutter)]">
          <div className="max-w-3xl">
            <Eyebrow>Privacy promise</Eyebrow>
            <h1 className="mt-5 font-display text-display-md md:text-display-lg text-ink">
              Your statements are processed securely and{" "}
              <em className="not-italic text-accent">automatically deleted</em>{" "}
              after your session ends.
            </h1>
            <p className="mt-6 max-w-2xl text-lg md:text-xl text-ink-soft leading-relaxed">
              This page is the plain-English version of how LabhPay handles your
              data. If anything below ever changes, we&rsquo;ll say so clearly
              &mdash; not bury it in a 40-page policy.
            </p>
          </div>
        </div>
      </Section>

      {/* What we store / don't */}
      <Section size="lg">
        <div className="grid md:grid-cols-2 gap-6">
          <Panel
            icon={Database}
            title="What we keep (briefly)"
            tone="paper"
            items={[
              "Your phone number and a randomly generated user ID",
              "Your settings: language, notifications, Private Mode preference",
              "Anonymous, aggregate analytics with no amounts or merchants",
            ]}
          />
          <Panel
            icon={EyeOff}
            title="What we never keep"
            tone="ink"
            items={[
              "Your uploaded PDFs",
              "Extracted transactions, merchants, or amounts",
              "Card numbers, full or otherwise",
              "OCR text, model prompts, or generated insights",
              "Chat history with the LabhPay Assistant",
            ]}
          />
        </div>
      </Section>

      {/* How it works */}
      <Section size="lg" className="bg-paper-warm/60">
        <div className="max-w-2xl">
          <Eyebrow>The lifecycle</Eyebrow>
          <h2 className="mt-4 font-display text-display-sm md:text-display-md text-ink">
            How your data lives. And ends.
          </h2>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-4 md:gap-6">
          <Stage
            n="01"
            icon={Lock}
            title="Encrypted in transit"
            body="TLS everywhere. Your PDF leaves your device encrypted and arrives encrypted."
          />
          <Stage
            n="02"
            icon={Server}
            title="Encrypted at rest, briefly"
            body="Statements live in volatile memory and an encrypted cache with a 30-minute timer. A per-session AES-GCM key wraps everything."
          />
          <Stage
            n="03"
            icon={Trash2}
            title="Deleted on exit"
            body="Logout, session expiry, inactivity, or analysis-complete (in Private Mode) — pick any one and your data is gone."
          />
        </div>
      </Section>

      {/* Security */}
      <Section size="lg" id="security">
        <div className="max-w-2xl">
          <Eyebrow>Security</Eyebrow>
          <h2 className="mt-4 font-display text-display-sm md:text-display-md text-ink">
            The boring details that matter most.
          </h2>
        </div>

        <ul className="mt-10 grid md:grid-cols-2 gap-4 md:gap-6">
          <Bullet title="AES-GCM at rest, TLS in transit" />
          <Bullet title="Card numbers masked at extraction — never logged, never sent to a model" />
          <Bullet title="Strict rate limits on OTP, uploads and the Assistant" />
          <Bullet title="PII-scrubbing logger — even our own errors don't leak your data" />
          <Bullet title="Hashed refresh tokens, rotating server secrets" />
          <Bullet title="Row-level security on every account record" />
        </ul>
      </Section>

      {/* Promises */}
      <Section size="lg" bleed className="bg-paper-ink">
        <div className="mx-auto max-w-site px-[var(--site-gutter)]">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-paper/70 text-[11px] uppercase tracking-eyebrow">
              <ShieldCheck size={14} /> Our promises
            </span>
            <h2 className="mt-5 font-display text-display-sm md:text-display-md text-paper">
              We will never &mdash;
            </h2>
            <ul className="mt-8 space-y-4 text-lg text-paper/85 leading-relaxed">
              <li>· Train any model on your financial data.</li>
              <li>· Sell, share or resell your transactions to anyone.</li>
              <li>· Use your statements to target you with ads.</li>
              <li>· Build a profile about you for any third party.</li>
              <li>· Move money on your behalf. LabhPay is read-only intelligence.</li>
            </ul>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/dashboard?upload=1">
                <Button variant="accent" size="lg">
                  Upload a statement
                </Button>
              </Link>
              <Link href="/">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-paper/20 bg-transparent text-paper hover:bg-paper/10 hover:border-paper/30"
                >
                  Back home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <Footer />
    </main>
  );
}

/* ---------- local helpers ---------- */

function Panel({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: React.ComponentType<any>;
  title: string;
  items: string[];
  tone: "paper" | "ink";
}) {
  const isInk = tone === "ink";
  return (
    <div
      className={[
        "rounded-2xl p-7 md:p-8 shadow-card",
        isInk ? "bg-paper-ink text-paper" : "bg-paper-card text-ink",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex h-10 w-10 items-center justify-center rounded-full",
          isInk ? "bg-paper/10 text-paper" : "bg-accent-soft text-accent-ink",
        ].join(" ")}
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <h3 className="mt-5 font-display text-2xl">{title}</h3>
      <ul className={`mt-4 space-y-2 text-[15px] leading-relaxed ${isInk ? "text-paper/85" : "text-ink-soft"}`}>
        {items.map((i) => (
          <li key={i}>· {i}</li>
        ))}
      </ul>
    </div>
  );
}

function Stage({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: string;
  icon: React.ComponentType<any>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-paper-card p-6 md:p-7 shadow-card-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft font-display text-accent-ink">
          {n}
        </span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl text-ink">{title}</h3>
      <p className="mt-2 text-[15px] text-ink-soft leading-relaxed">{body}</p>
    </div>
  );
}

function Bullet({ title }: { title: string }) {
  return (
    <li className="rounded-2xl bg-paper-card p-5 shadow-card-sm flex items-start gap-3">
      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
      <span className="text-[15px] text-ink-soft leading-relaxed">{title}</span>
    </li>
  );
}
