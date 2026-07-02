import Link from "next/link";
import { Info, AlertTriangle, ArrowRight } from "lucide-react";
import type { Block } from "@/lib/blog/types";

/** Stable slug for an H2 so we could deep-link / build a TOC later. */
function anchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export function ArticleRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2
                key={i}
                id={anchor(b.text)}
                className="font-display text-2xl md:text-3xl text-ink pt-6 scroll-mt-24"
              >
                {b.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="font-display text-xl text-ink pt-2">
                {b.text}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="text-[16px] leading-relaxed text-ink-soft">
                {b.text}
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="list-disc pl-5 space-y-1.5 text-[16px] text-ink-soft">
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal pl-5 space-y-1.5 text-[16px] text-ink-soft">
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-2xl border border-ink/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-paper-warm text-ink-muted text-left text-[11px] uppercase tracking-eyebrow">
                      {b.headers.map((h, j) => (
                        <th key={j} className="px-4 py-3 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j} className="border-t border-ink/8">
                        {row.map((cell, k) => (
                          <td key={k} className="px-4 py-3 text-ink-soft">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "callout": {
            const warn = b.tone === "warn";
            const Icon = warn ? AlertTriangle : Info;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-2xl p-4 md:p-5 ${
                  warn ? "bg-amber-50" : "bg-accent-mist"
                }`}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                    warn ? "bg-amber-100 text-amber-700" : "bg-paper-card text-accent-ink"
                  }`}
                >
                  <Icon size={15} />
                </span>
                <div>
                  {b.title ? (
                    <p className="font-display text-[15px] text-ink">{b.title}</p>
                  ) : null}
                  <p className="mt-0.5 text-[14px] text-ink-soft leading-relaxed">
                    {b.text}
                  </p>
                </div>
              </div>
            );
          }
          case "cta":
            return (
              <div
                key={i}
                className="rounded-3xl bg-paper-ink text-paper p-6 md:p-7 my-4"
              >
                <p className="text-[16px] leading-relaxed">{b.text}</p>
                <Link
                  href="/dashboard?upload=1"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-paper underline underline-offset-4"
                >
                  Analyze my statement free <ArrowRight size={14} />
                </Link>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
