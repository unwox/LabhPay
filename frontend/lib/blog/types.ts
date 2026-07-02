export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; tone?: "info" | "warn"; title?: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "cta"; text: string };

export type FaqItem = { q: string; a: string };

export type Post = {
  slug: string;
  bank: string;
  title: string; // H1 / OG title
  metaTitle: string; // <title>
  description: string; // meta description
  focusKeyword: string;
  keywords: string[];
  datePublished: string; // ISO
  dateModified: string; // ISO
  readingMinutes: number;
  blocks: Block[];
  faqs?: FaqItem[];
};
