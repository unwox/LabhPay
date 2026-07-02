import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { POSTS } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Money & Tax Guides for India — Cards, Statements, Taxes",
  description:
    "Practical guides to your money in India: understanding credit card & bank statements, taxes and Form 16, and choosing the right tax regime — plus card login, customer care and how-to guides.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = [...POSTS].sort((a, b) =>
    b.datePublished.localeCompare(a.datePublished)
  );

  return (
    <main className="relative">
      <Nav />
      <section className="px-[var(--site-gutter)] pt-28 md:pt-36 pb-16 max-w-3xl mx-auto">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
          LabhPay Guides
        </p>
        <h1 className="mt-3 font-display text-display-sm md:text-5xl text-ink">
          Guides for your money.
        </h1>
        <p className="mt-3 text-ink-soft text-lg">
          Clear, practical guides on your cards, statements and taxes — how to
          read them, cut charges, and make smarter decisions.
        </p>

        <div className="mt-10 divide-y divide-ink/10 border-t border-ink/10">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group flex items-start justify-between gap-4 py-6 hover:bg-accent-mist/30 -mx-3 px-3 rounded-2xl transition-colors"
            >
              <div>
                <p className="text-[11px] uppercase tracking-eyebrow text-accent-ink">
                  {p.bank} · {p.readingMinutes} min read
                </p>
                <h2 className="mt-1.5 font-display text-xl md:text-2xl text-ink leading-tight">
                  {p.title}
                </h2>
                <p className="mt-2 text-ink-soft text-[15px]">{p.description}</p>
              </div>
              <span className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper-warm text-ink-soft shrink-0 group-hover:translate-x-0.5 transition-transform">
                <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
