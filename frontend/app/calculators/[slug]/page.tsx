import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Calculator } from "@/components/calculators/Calculator";
import { CALCS, getCalc, calcSlugs } from "@/lib/calculators/registry";

const SITE = "https://labhpay.com";

export function generateStaticParams() {
  return calcSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const c = getCalc(params.slug);
  if (!c) return {};
  return {
    title: c.metaTitle,
    description: c.description,
    keywords: c.keywords,
    alternates: { canonical: `/calculators/${c.slug}` },
    openGraph: {
      title: c.metaTitle,
      description: c.description,
      type: "website",
      url: `${SITE}/calculators/${c.slug}`,
      siteName: "LabhPay",
      locale: "en_IN",
    },
    twitter: { card: "summary_large_image", title: c.metaTitle, description: c.description },
  };
}

export default function CalculatorPage({
  params,
}: {
  params: { slug: string };
}) {
  const c = getCalc(params.slug);
  if (!c) notFound();

  const url = `${SITE}/calculators/${c.slug}`;
  const others = CALCS.filter((x) => x.slug !== c.slug);

  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: c.name,
    url,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description: c.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Calculators", item: `${SITE}/calculators` },
      { "@type": "ListItem", position: 3, name: c.name, item: url },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <Nav />

      <section className="px-[var(--site-gutter)] pt-28 md:pt-36 pb-16 max-w-4xl mx-auto">
        <Link href="/calculators" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
          <ChevronLeft size={15} /> All calculators
        </Link>

        <h1 className="mt-6 font-display text-display-sm md:text-4xl text-ink leading-tight">
          {c.h1}
        </h1>
        <div className="mt-4 space-y-3 max-w-3xl">
          {c.intro.map((p, i) => (
            <p key={i} className="text-[16px] leading-relaxed text-ink-soft">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-8">
          <Calculator slug={c.slug} />
        </div>

        {/* Funnel to the product */}
        <div className="mt-8 rounded-3xl bg-paper-ink text-paper p-6 md:p-7">
          <p className="text-[16px] leading-relaxed">
            Want the full picture of your money? Upload your credit card or bank
            statement to LabhPay and instantly see hidden charges, EMIs, recurring
            subscriptions and where every rupee went — free and auto-deleted.
          </p>
          <Link
            href="/dashboard?upload=1"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
          >
            Analyze my statement free
          </Link>
        </div>

        {/* FAQ (visible + schema-backed) */}
        <section className="mt-12">
          <h2 className="font-display text-2xl md:text-3xl text-ink">
            Frequently asked questions
          </h2>
          <div className="mt-5 divide-y divide-ink/10 border-t border-ink/10">
            {c.faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <h3 className="font-display text-lg text-ink">{f.q}</h3>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-paper-warm text-ink-soft shrink-0 transition-transform group-open:rotate-180">
                    <ChevronDown size={16} />
                  </span>
                </summary>
                <p className="mt-3 text-[15px] text-ink-soft leading-relaxed pr-12">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Internal links */}
        <section className="mt-12 pt-8 border-t border-ink/10">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            More calculators
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/calculators/${o.slug}`}
                  className="inline-flex rounded-full border border-ink/12 px-3 py-1.5 text-sm text-ink-soft hover:bg-accent-mist hover:text-accent-ink"
                >
                  {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <Footer />
    </main>
  );
}
