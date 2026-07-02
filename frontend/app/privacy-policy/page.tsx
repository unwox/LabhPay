import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ArticleRenderer } from "@/components/blog/ArticleRenderer";
import { PRIVACY_POLICY, LEGAL_UPDATED } from "@/lib/legal/content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How LabhPay collects, uses, protects and deletes your data — DPDP-aligned. Statements and Form 16 are processed in memory and auto-deleted; never sold or used to train models.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="relative">
      <Nav />
      <section className="px-[var(--site-gutter)] pt-28 md:pt-36 pb-16 max-w-3xl mx-auto">
        <h1 className="font-display text-display-sm md:text-5xl text-ink">Privacy Policy</h1>
        <p className="mt-3 text-ink-muted text-sm">Last updated: {LEGAL_UPDATED}</p>
        <div className="mt-8">
          <ArticleRenderer blocks={PRIVACY_POLICY} />
        </div>
      </section>
      <Footer />
    </main>
  );
}
