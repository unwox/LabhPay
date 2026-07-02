import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { TaxSaver } from "@/components/tax/TaxSaver";

const SITE = "https://labhpay.com";

export const metadata: Metadata = {
  title: "Tax Saver — How to Pay Less Income Tax, Legally (FY 2025-26)",
  description:
    "Free tax-saving planner for India. Enter your salary and see exactly how much more tax you can save — 80C, NPS, 80D, employer NPS — with a step-by-step plan. Upload Form 16 to auto-fill.",
  alternates: { canonical: "/tax" },
  keywords: [
    "how to save tax",
    "tax saving options for salaried",
    "save income tax india",
    "80c investment options",
    "nps tax benefit 80ccd(1b)",
    "80d deduction",
    "old vs new tax regime",
    "income tax refund calculator",
    "form 16",
  ],
  openGraph: {
    title: "Tax Saver — Pay Less Income Tax, Legally",
    description:
      "See exactly how much more tax you can save this year, with a step-by-step plan. Free, private, auto-deleted.",
    type: "website",
    url: `${SITE}/tax`,
    siteName: "LabhPay",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "Tax Saver — LabhPay" },
};

const FAQS = [
  {
    q: "How can I save income tax on my salary?",
    a: "The main legal levers for salaried people are: Section 80C investments up to ₹1.5 lakh (EPF, ELSS, PPF, life insurance), an extra ₹50,000 in NPS under 80CCD(1B), health-insurance premiums under 80D, HRA if you pay rent, and employer NPS under 80CCD(2). This planner checks each one against your numbers and shows the rupee saving.",
  },
  {
    q: "Do 80C and NPS help in the new tax regime?",
    a: "Mostly no — 80C, 80D, HRA and your own NPS (80CCD(1B)) only reduce tax under the old regime. The big exception is employer NPS under Section 80CCD(2), which is deductible in BOTH regimes. The planner accounts for all of this automatically.",
  },
  {
    q: "Which is better, the old or new tax regime?",
    a: "It depends on how many deductions you actually use. The planner computes both regimes for your exact numbers — including after your potential investments — and always shows the cheaper path.",
  },
  {
    q: "Can I upload my Form 16 or payslip?",
    a: "Yes — upload your Form 16, salary slip, Form 12BA or 26AS and the planner auto-fills your numbers from them. Documents are read in memory, never stored, and you review every figure before anything is computed.",
  },
  {
    q: "Is this the same as filing my ITR?",
    a: "No. This planner tells you how to reduce tax and what to expect (refund or payable). You still file at incometax.gov.in — the planner gives you a downloadable summary that makes filing (or handing off to a CA) easy.",
  },
];

export default function TaxSaverPage() {
  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "LabhPay Tax Saver",
    url: `${SITE}/tax`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    description:
      "Tax-saving planner for India: see how much more tax you can save with 80C, NPS, 80D and employer NPS — with a step-by-step plan.",
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <Nav />
      <section className="px-[var(--site-gutter)] pt-28 md:pt-36 pb-16 max-w-5xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent-ink">
          Tax Saver · FY 2025-26
        </p>
        <h1 className="mt-3 font-display text-display-sm md:text-display-md text-ink leading-[1.02]">
          Pay less tax. <span className="text-gradient-accent">Legally.</span>
        </h1>
        <p className="mt-4 text-lg md:text-xl text-ink-soft max-w-2xl">
          Answer a few questions — or upload your Form 16 / payslip to auto-fill —
          and get a step-by-step plan showing exactly how many rupees you can
          still save this year. Nothing is stored.
        </p>

        <div className="mt-9">
          <TaxSaver />
        </div>

        <section className="mt-14">
          <h2 className="font-display text-2xl md:text-3xl text-ink">
            Frequently asked questions
          </h2>
          <div className="mt-5 divide-y divide-ink/10 border-t border-ink/10">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <h3 className="font-display text-lg text-ink">{f.q}</h3>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-paper-warm text-ink-soft shrink-0 transition-transform group-open:rotate-180">
                    <ChevronDown size={16} />
                  </span>
                </summary>
                <p className="mt-3 text-[15px] text-ink-soft leading-relaxed pr-12">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </section>
      <Footer />
    </main>
  );
}
