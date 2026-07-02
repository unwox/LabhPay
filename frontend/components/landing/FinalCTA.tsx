import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section className="px-[var(--site-gutter)] py-20 md:py-28 max-w-site mx-auto">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-paper-ink text-paper px-8 py-14 md:px-16 md:py-20 text-center">
          {/* soft glow */}
          <div
            aria-hidden
            className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(closest-side, rgba(45,163,131,0.35), transparent)" }}
          />
          <div className="relative">
            <h2 className="font-display text-display-sm md:text-5xl leading-[1.05] max-w-2xl mx-auto">
              See where your money goes — in the next two minutes.
            </h2>
            <p className="mt-4 text-lg text-paper/70 max-w-xl mx-auto">
              Free to use. Nothing stored. Your documents are auto-deleted after
              your session ends.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard?upload=1">
                <Button variant="accent" size="lg">
                  Analyze a statement
                </Button>
              </Link>
              <Link href="/tax">
                <Button
                  variant="outline"
                  size="lg"
                  className="!bg-transparent !text-paper !border-white/25 hover:!bg-white/10"
                >
                  Try the Tax Toolkit
                </Button>
              </Link>
            </div>
            <p className="mt-8 inline-flex items-center gap-2 text-[13px] text-paper/60">
              <ShieldCheck size={14} /> Privacy-first · No card details · Made for India
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
