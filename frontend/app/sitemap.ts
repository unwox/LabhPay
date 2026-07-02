import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/blog/posts";
import { CALCS } from "@/lib/calculators/registry";

const SITE = "https://labhpay.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // Public, indexable pages only.
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/tax`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/calculators`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/privacy-policy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];
  const calcPages: MetadataRoute.Sitemap = CALCS.map((c) => ({
    url: `${SITE}/calculators/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const postPages: MetadataRoute.Sitemap = POSTS.map((p) => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: new Date(p.dateModified),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...staticPages, ...calcPages, ...postPages];
}
