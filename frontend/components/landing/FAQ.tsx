import { ChevronDown } from "lucide-react";

/**
 * FAQ section — doubles as SEO content. The answers are real DOM text (native
 * <details> disclosure, no JS needed) so they're crawlable and satisfy
 * Google's FAQ rich-result requirement that answers be visible on the page.
 * FAQ_ITEMS is reused to emit the matching FAQPage JSON-LD on the homepage.
 *
 * Questions are chosen to target real Indian search intent:
 * "is it safe to upload credit card statement", "minimum amount due meaning",
 * "how to read credit card statement", "which banks", etc.
 */
export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is LabhPay?",
    a: "LabhPay is a free credit card statement analyzer made for India. Upload your statement PDF and it instantly shows hidden charges, recurring subscriptions, EMIs, your credit utilization and a clear breakdown of where your money went.",
  },
  {
    q: "Is it safe to upload my credit card statement?",
    a: "Yes. Your statement is processed in memory, encrypted in transit, and automatically deleted after your session ends. Your full card number is masked, and we never train on, sell, or share your data.",
  },
  {
    q: "Which banks does LabhPay support?",
    a: "LabhPay reads credit card statements from HDFC, SBI, ICICI, Axis, Kotak, AU, OneCard, IndusInd, RBL and American Express, with more banks being added.",
  },
  {
    q: "Is LabhPay free to use?",
    a: "Yes, it is completely free. Sign in with Google and upload your statement — no payment, and no card details are ever required.",
  },
  {
    q: "What can LabhPay find in my statement?",
    a: "It surfaces hidden charges such as finance and interest charges, GST and late fees; detects recurring subscriptions; flags EMI conversions; estimates your credit utilization; and groups your spending by category.",
  },
  {
    q: "What is the minimum amount due on a credit card?",
    a: "The minimum amount due is the smallest amount you must pay by the due date to avoid a late-payment fee. Paying only the minimum still accrues interest on the remaining balance — LabhPay shows you exactly how much that is costing you.",
  },
  {
    q: "How do I read my credit card statement?",
    a: "Upload the statement PDF to LabhPay and it automatically highlights your total amount due, due date, minimum due, finance charges, EMIs and category-wise spending — so you don't have to decode the statement line by line.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-[var(--site-gutter)] py-16 md:py-24 max-w-3xl mx-auto">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
        Questions
      </p>
      <h2 className="mt-3 font-display text-display-sm md:text-4xl text-ink">
        Credit card statements, demystified.
      </h2>
      <p className="mt-3 text-ink-soft">
        Common questions about reading your statement and using LabhPay.
      </p>

      <div className="mt-8 divide-y divide-ink/10 border-t border-ink/10">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
              <h3 className="font-display text-lg md:text-xl text-ink">
                {item.q}
              </h3>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-paper-warm text-ink-soft shrink-0 transition-transform group-open:rotate-180">
                <ChevronDown size={16} />
              </span>
            </summary>
            <p className="mt-3 text-[15px] text-ink-soft leading-relaxed pr-12">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
