import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ArticleRenderer } from "@/components/blog/ArticleRenderer";
import { TERMS, LEGAL_UPDATED } from "@/lib/legal/content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for using LabhPay. LabhPay provides informational insights and estimates only — not financial, investment, tax or legal advice.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="relative">
      <Nav />
      <section className="px-[var(--site-gutter)] pt-28 md:pt-36 pb-16 max-w-3xl mx-auto">
        <h1 className="font-display text-display-sm md:text-5xl text-ink">Terms of Service</h1>
        <p className="mt-3 text-ink-muted text-sm">Last updated: {LEGAL_UPDATED}</p>
        <div className="mt-8">
          <ArticleRenderer blocks={TERMS} />
        </div>
      </section>
      <Footer />
    </main>
  );
}
