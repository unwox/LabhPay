import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ArticleRenderer } from "@/components/blog/ArticleRenderer";
import { POSTS, getPost, allSlugs } from "@/lib/blog/posts";

const SITE = "https://labhpay.com";

export function generateStaticParams() {
  return allSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  const url = `${SITE}/blog/${post.slug}`;
  return {
    title: post.metaTitle,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.metaTitle,
      description: post.description,
      type: "article",
      url,
      siteName: "LabhPay",
      locale: "en_IN",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.description,
    },
  };
}

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const url = `${SITE}/blog/${post.slug}`;
  const related = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    inLanguage: "en-IN",
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "LabhPay", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "LabhPay",
      logo: { "@type": "ImageObject", url: `${SITE}/opengraph-image` },
    },
    image: `${SITE}/opengraph-image`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: post.bank, item: url },
    ],
  };

  const faqLd = post.faqs?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <main className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}

      <Nav />

      <article className="px-[var(--site-gutter)] pt-28 md:pt-36 pb-16 max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ChevronLeft size={15} /> All guides
        </Link>

        <p className="mt-6 text-[11px] uppercase tracking-eyebrow text-accent-ink">
          {post.bank} · {post.readingMinutes} min read
        </p>
        <h1 className="mt-3 font-display text-display-sm md:text-5xl text-ink leading-[1.05]">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-ink-soft">{post.description}</p>

        <div className="mt-10">
          <ArticleRenderer blocks={post.blocks} />
        </div>

        {post.faqs?.length ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl md:text-3xl text-ink">
              Frequently asked questions
            </h2>
            <div className="mt-5 divide-y divide-ink/10 border-t border-ink/10">
              {post.faqs.map((f) => (
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
        ) : null}

        {/* Related guides — internal links help crawl + ranking */}
        <section className="mt-14 pt-8 border-t border-ink/10">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            More bank guides
          </p>
          <ul className="mt-4 space-y-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/blog/${r.slug}`}
                  className="text-accent-ink hover:underline underline-offset-4"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>

      <Footer />
    </main>
  );
}
