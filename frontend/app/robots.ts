import type { MetadataRoute } from "next";

const SITE = "https://labhpay.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep authenticated / app surfaces out of the index.
      disallow: ["/dashboard", "/upload", "/admin", "/login"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
