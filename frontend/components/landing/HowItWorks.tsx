import { Section, Eyebrow, SectionTitle, SectionLede } from "@/components/ui/section";
import { Stepper } from "@/components/ui/stepper";

export function HowItWorks() {
  return (
    <Section size="lg" id="how" className="bg-paper-warm/60">
      <div className="max-w-2xl">
        <Eyebrow>How it works</Eyebrow>
        <SectionTitle className="mt-4">
          Three steps. <em className="italic">Then quiet clarity.</em>
        </SectionTitle>
        <SectionLede className="mt-5">
          You upload. We read. You decide. Statements are processed in memory,
          encrypted in transit, and auto-deleted when you sign out.
        </SectionLede>
      </div>

      <div className="mt-12">
        <Stepper
          steps={[
            {
              index: 1,
              title: "Upload your statement",
              body: "Drop a PDF from any major Indian bank. Password-protected statements are supported &mdash; we ask for the password securely.",
            },
            {
              index: 2,
              title: "Get an honest read",
              body: "Transactions normalised, merchants tagged, finance charges and GST surfaced. Insights ranked by what actually matters this month.",
            },
            {
              index: 3,
              title: "Act in one tap",
              body: "Dispute a charge, cancel a subscription, draft a refund email &mdash; LabhPay fills in the details for you.",
            },
          ]}
        />
      </div>
    </Section>
  );
}
