import type { Metadata } from "next";
import Link from "next/link";
import { Calculator as CalcIcon, ArrowRight } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { CALCS } from "@/lib/calculators/registry";

export const metadata: Metadata = {
  title: "Free Financial Calculators — Income Tax, EMI, SIP & HRA",
  description:
    "Free financial calculators for India: income tax (old vs new regime), home/car/personal loan EMI, mutual fund SIP returns and HRA exemption. Fast, accurate, no sign-up.",
  alternates: { canonical: "/calculators" },
};

export default function CalculatorsHub() {
  return (
    <main className="relative">
      <Nav />
      <section className="px-[var(--site-gutter)] pt-28 md:pt-36 pb-16 max-w-3xl mx-auto">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
          Free tools
        </p>
        <h1 className="mt-3 font-display text-display-sm md:text-5xl text-ink">
          Financial calculators for India.
        </h1>
        <p className="mt-3 text-ink-soft text-lg">
          Quick, accurate calculators for tax, loans and investments — no sign-up,
          nothing stored.
        </p>

        <div className="mt-10 grid sm:grid-cols-2 gap-4">
          {CALCS.map((c) => (
            <Link
              key={c.slug}
              href={`/calculators/${c.slug}`}
              className="group rounded-2xl border border-ink/10 p-5 hover:bg-accent-mist/30 hover:border-ink/20 transition-colors"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-mist text-accent-ink">
                <CalcIcon size={18} strokeWidth={1.75} />
              </span>
              <p className="mt-3 font-display text-xl text-ink">{c.name}</p>
              <p className="mt-1 text-[14px] text-ink-soft line-clamp-2">
                {c.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent-ink">
                Open <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
