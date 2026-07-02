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

      {/* Infinite marquee — list duplicated for a seamless loop; pauses on hover */}
      <div className="marquee overflow-hidden" aria-label="Supported banks">
        <div className="marquee-track items-center gap-x-12 md:gap-x-16 pr-12 md:pr-16">
          {[...BANKS, ...BANKS].map((b, i) => (
            <span
              key={`${b}-${i}`}
              className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"
            >
              <BankLogo name={b} />
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}
