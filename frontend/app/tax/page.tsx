import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { TaxToolkit } from "@/components/tax/TaxToolkit";

const SITE = "https://labhpay.com";

export const metadata: Metadata = {
  title: "Form 16 Tax Calculator — Old vs New Regime & Refund (FY 2025-26)",
  description:
    "Free Form 16 tax toolkit for India: compare old vs new regime, estimate your income tax refund or amount payable, spot missed deductions, and get an ITR-ready summary. Upload Form 16 to auto-fill.",
  alternates: { canonical: "/tax" },
  keywords: [
    "form 16",
    "form 16 tax calculator",
    "income tax refund calculator",
    "old vs new tax regime calculator",
    "itr calculator",
    "how to file itr",
    "tax saving calculator",
  ],
  openGraph: {
    title: "Form 16 Tax Toolkit — Old vs New Regime & Refund",
    description:
      "Upload your Form 16 or enter your numbers to compare regimes, estimate your refund, and get an ITR-ready summary. Free, private, auto-deleted.",
    type: "website",
    url: `${SITE}/tax`,
    siteName: "LabhPay",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "Form 16 Tax Toolkit — LabhPay" },
};

const FAQS = [
  {
    q: "How do I use my Form 16 to calculate tax?",
    a: "Read the key figures from your Form 16 Part B — gross salary, deductions (80C, 80D, etc.) and TDS deducted — and enter them here, or upload the Form 16 PDF to auto-fill. The toolkit then compares the old and new regimes and estimates your refund or tax payable.",
  },
  {
    q: "Will I get a tax refund?",
    a: "If the tax already deducted (TDS) shown on your Form 16 is more than your actual tax liability for the year, you're due a refund. This toolkit estimates that difference. The final refund is determined when you file your ITR on the income tax portal.",
  },
  {
    q: "Should I choose the old or new tax regime?",
    a: "It depends on your deductions. The new regime usually wins with few deductions (higher standard deduction, rebate up to ₹12 lakh); the old regime can win if you fully use 80C, 80D, HRA and home loan interest. The toolkit shows both and recommends the lower-tax option.",
  },
  {
    q: "Is my Form 16 safe to upload?",
    a: "Yes. Your Form 16 is processed in memory to read the numbers and is never stored. We don't keep your PAN or name. You always review the figures before anything is computed.",
  },
];

export default function TaxToolkitPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "LabhPay Form 16 Tax Toolkit",
    url: `${SITE}/tax`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    description:
      "Compare old vs new tax regime, estimate your refund, and get an ITR-ready summary from your Form 16.",
  };

  return (
    <main className="relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <Nav />
      <section className="px-[var(--site-gutter)] pt-28 md:pt-36 pb-16 max-w-4xl mx-auto">
        <p className="text-[11px] uppercase tracking-eyebrow text-accent-ink">Tax Toolkit · FY 2025-26</p>
        <h1 className="mt-3 font-display text-display-sm md:text-5xl text-ink leading-[1.05]">
          Your Form 16, decoded.
        </h1>
        <p className="mt-4 text-lg text-ink-soft max-w-2xl">
          Compare the old vs new tax regime, see your estimated refund or tax
          payable, find deductions you&rsquo;re missing, and download an
          ITR-ready summary. Upload your Form 16 to auto-fill — or just type your
          numbers. Nothing is stored.
        </p>

        <div className="mt-8">
          <TaxToolkit />
        </div>

        <section className="mt-12">
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
