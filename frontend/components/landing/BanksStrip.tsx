import { Section, Eyebrow } from "@/components/ui/section";
import { BankLogo } from "@/components/ui/bank-logo";

const BANKS = [
  "HDFC",
  "SBI Card",
  "ICICI",
  "Axis",
  "Kotak",
  "AU",
  "OneCard",
  "IndusInd",
  "RBL",
  "American Express",
  "Bank of Baroda",
];

export function BanksStrip() {
  return (
    <Section size="md">
      <div className="text-center">
        <Eyebrow>Supported issuers</Eyebrow>
        <p className="mt-3 font-display text-2xl md:text-3xl text-ink-soft">
          Every major Indian credit card.
        </p>
      </div>

      <div className="hair my-10" />

      <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 md:gap-x-12">
        {BANKS.map((b) => (
          <BankLogo key={b} name={b} />
        ))}
      </div>
    </Section>
  );
}
