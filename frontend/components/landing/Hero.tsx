import Link from "next/link";
import { Section, Eyebrow } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { StatementCard } from "./StatementCard";

export function Hero() {
  return (
    <Section
      size="xl"
      bleed
      className="overflow-hidden pt-32 md:pt-36 bg-ivory-fade"
    >
      {/* Decorative emerald glow */}
      <div
        aria-hidden
        className="orb"
        style={{
          background:
            "radial-gradient(closest-side, rgba(14,92,73,0.18), rgba(14,92,73,0))",
          width: 520,
          height: 520,
          top: -120,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      <div className="mx-auto max-w-site px-[var(--site-gutter)] grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Copy */}
        <div className="lg:col-span-7 relative animate-fade-rise">
          <Eyebrow>Privacy-first · Made for Indian credit cards</Eyebrow>
          <h1 className="mt-5 font-display text-display-md md:text-display-lg lg:text-display-xl text-ink">
            Understand your <em className="italic text-accent">credit card</em> bills.
          </h1>
          <p className="mt-6 max-w-xl text-lg md:text-xl text-ink-soft leading-relaxed">
            Intelligent financial insights for every statement &mdash;
            hidden charges, recurring subscriptions, smarter rewards.
            Processed securely, auto-deleted after your session.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/dashboard?upload=1">
              <Button variant="primary" size="lg">
                Upload your statement
              </Button>
            </Link>
            <Link href="#how">
              <Button variant="outline" size="lg">
                See how it works
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-ink-muted">
            HDFC · SBI · ICICI · Axis · Kotak · AU · OneCard · IndusInd · RBL ·
            American Express · Bank of Baroda
          </p>
        </div>

        {/* Stacked wallet cards */}
        <div className="lg:col-span-5 relative h-[420px] md:h-[480px]">
          <div
            className="absolute right-0 md:right-6 top-4 animate-float-slow"
            style={{ animationDelay: "0.2s" } as React.CSSProperties}
          >
            <StatementCard
              bank="HDFC"
              last4="4218"
              outstanding="₹ 48,290"
              dueDate="12 Jun"
              tone="ink"
              style={{ ["--tilt" as string]: "-6deg" }}
            />
          </div>
          <div
            className="absolute right-12 md:right-24 top-32 md:top-36 animate-float-slow"
            style={{ animationDelay: "0.6s" } as React.CSSProperties}
          >
            <StatementCard
              bank="SBI Card"
              last4="0091"
              outstanding="₹ 12,460"
              dueDate="03 Jun"
              tone="emerald"
              style={{ ["--tilt" as string]: "3deg" }}
            />
          </div>
          <div
            className="absolute right-4 md:right-10 top-60 md:top-72 animate-float-slow"
            style={{ animationDelay: "1.0s" } as React.CSSProperties}
          >
            <StatementCard
              bank="OneCard"
              last4="7733"
              outstanding="₹ 27,140"
              dueDate="18 Jun"
              tone="gold"
              style={{ ["--tilt" as string]: "-2deg" }}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}
