import Link from "next/link";
import { Section, Eyebrow } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export function PrivacyCallout() {
  return (
    <Section size="lg" bleed className="bg-paper-ink">
      <div className="mx-auto max-w-site px-[var(--site-gutter)]">
        <Card
          tone="ink"
          elevation="xl"
          className="relative overflow-hidden p-8 md:p-14"
        >
          <div
            aria-hidden
            className="orb"
            style={{
              background:
                "radial-gradient(closest-side, rgba(14,92,73,0.45), rgba(14,92,73,0))",
              width: 480,
              height: 480,
              top: -100,
              right: -120,
            }}
          />

          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 text-paper/70 text-[11px] uppercase tracking-eyebrow">
              <ShieldCheck size={14} /> Privacy promise
            </span>
            <h2 className="mt-5 font-display text-display-sm md:text-display-md text-paper">
              Your statements are processed securely and{" "}
              <em className="italic text-accent-soft">
                automatically deleted
              </em>{" "}
              after your session ends.
            </h2>
            <p className="mt-6 text-lg text-paper/80 leading-relaxed">
              No model training on your data. No advertising. No resale.
              No profiling. Only minimal account metadata persists &mdash;
              the financial details disappear with you.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/privacy">
                <Button variant="accent" size="lg">
                  Read the privacy promise
                </Button>
              </Link>
              <Link href="/upload">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-paper/20 bg-transparent text-paper hover:bg-paper/10 hover:border-paper/30"
                >
                  Try with a statement
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
}
