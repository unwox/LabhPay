import { Section, Eyebrow, SectionTitle, SectionLede } from "@/components/ui/section";
import { Stepper } from "@/components/ui/stepper";

export function HowItWorks() {
  return (
    <Section size="lg" id="how" className="bg-paper-warm/60">
      <div className="max-w-2xl">
        <Eyebrow>How it works</Eyebrow>
        <SectionTitle className="mt-4">
          Three steps. <span className="text-ink-soft">Then quiet clarity.</span>
        </SectionTitle>
        <SectionLede className="mt-5">
          You upload. We read. You decide. Every document is processed in memory,
          encrypted in transit, and auto-deleted when your session ends.
        </SectionLede>
      </div>

      <div className="mt-12">
        <Stepper
          steps={[
            {
              index: 1,
              title: "Upload your document",
              body: "A credit card or bank statement, or your Form 16 — any PDF from any major Indian bank or employer. Password-protected files are supported.",
            },
            {
              index: 2,
              title: "We read it privately",
              body: "In seconds, LabhPay makes sense of it — charges and subscriptions surfaced, salary and tax decoded — all in memory, nothing stored.",
            },
            {
              index: 3,
              title: "Understand and act",
              body: "See what matters in plain English: money to save, the smarter tax regime, the next step spelled out — with one tap to act on it.",
            },
          ]}
        />
      </div>
    </Section>
  );
}
