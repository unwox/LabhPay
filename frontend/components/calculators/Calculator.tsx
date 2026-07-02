"use client";

import { IncomeTaxCalculator } from "./IncomeTaxCalculator";
import { EmiCalculator } from "./EmiCalculator";
import { SipCalculator } from "./SipCalculator";
import { HraCalculator } from "./HraCalculator";

/** Single client boundary that renders the right calculator for a slug. */
export function Calculator({ slug }: { slug: string }) {
  switch (slug) {
    case "income-tax-calculator":
      return <IncomeTaxCalculator />;
    case "emi-calculator":
      return <EmiCalculator />;
    case "sip-calculator":
      return <SipCalculator />;
    case "hra-calculator":
      return <HraCalculator />;
    default:
      return null;
  }
}
