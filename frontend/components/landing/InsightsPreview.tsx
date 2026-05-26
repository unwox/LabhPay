import { Section, Eyebrow, SectionTitle, SectionLede } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Repeat, Sparkles, ArrowRight } from "lucide-react";

const insights = [
  {
    icon: AlertTriangle,
    eyebrow: "Hidden charge",
    title: "₹ 320 in GST on finance charges",
    body: "You carried a balance into this cycle. Paying in full next month avoids the same charge.",
    cta: "See the charge",
    tone: "warm",
  },
  {
    icon: Repeat,
    eyebrow: "Recurring",
    title: "6 active subscriptions, ₹ 1,948 / month",
    body: "Netflix, Spotify, Hotstar, iCloud, YouTube Premium and one you may not recognise.",
    cta: "Review subscriptions",
    tone: "mist",
  },
  {
    icon: Sparkles,
    eyebrow: "Smart recommendation",
    title: "Use a fuel card for Indian Oil",
    body: "Your fuel spend is ₹ 4,200/month. A fuel-surcharge-waived card could save ~₹ 1,000 a year.",
    cta: "See the suggestion",
    tone: "gold",
  },
];

export function InsightsPreview() {
  return (
    <Section size="lg">
      <div className="max-w-2xl">
        <Eyebrow>What you&rsquo;ll see</Eyebrow>
        <SectionTitle className="mt-4">
          Insights worth reading. Never more than you need.
        </SectionTitle>
        <SectionLede className="mt-5">
          Every insight tells you what happened, why it matters, and the one
          thing to do next. We rank by financial impact &mdash; not by how
          loudly the model can talk.
        </SectionLede>
      </div>

      <div className="mt-12 grid md:grid-cols-3 gap-4 md:gap-6">
        {insights.map((it) => (
          <Card
            key={it.title}
            elevation="md"
            className="p-6 flex flex-col gap-4"
          >
            <span
              className={[
                "inline-flex h-10 w-10 items-center justify-center rounded-full",
                it.tone === "warm"
                  ? "bg-paper-warm text-ink"
                  : it.tone === "mist"
                  ? "bg-accent-mist text-accent-ink"
                  : "bg-gold-soft text-gold",
              ].join(" ")}
            >
              <it.icon size={18} strokeWidth={1.75} />
            </span>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                {it.eyebrow}
              </p>
              <h3 className="font-display text-2xl text-ink leading-snug">
                {it.title}
              </h3>
              <p className="text-[15px] text-ink-soft leading-relaxed">
                {it.body}
              </p>
            </div>

            <div className="mt-auto inline-flex items-center gap-1.5 text-sm text-ink hover:text-accent-ink transition-colors">
              {it.cta} <ArrowRight size={14} />
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}
