export type CalcMeta = {
  slug: string;
  name: string; // short name for cards/nav
  h1: string;
  metaTitle: string;
  description: string;
  keywords: string[];
  intro: string[]; // paragraphs above the calculator
  faqs: { q: string; a: string }[];
};

export const CALCS: CalcMeta[] = [
  {
    slug: "income-tax-calculator",
    name: "Income Tax Calculator",
    h1: "Income Tax Calculator (Old vs New Regime) — FY 2025-26",
    metaTitle: "Income Tax Calculator FY 2025-26 — Old vs New Regime",
    description:
      "Free income tax calculator for FY 2025-26 (AY 2026-27). Compare the old vs new tax regime, see your tax, rebate and effective rate, and find which saves you more.",
    keywords: [
      "income tax calculator",
      "income tax calculator fy 2025-26",
      "old vs new tax regime calculator",
      "new tax regime calculator",
      "income tax slab 2025-26",
      "tax calculator india",
    ],
    intro: [
      "Use this free income tax calculator to estimate your tax for FY 2025-26 (AY 2026-27) under both the old and new tax regimes, and instantly see which one saves you more. Enter your annual income and deductions to compare side by side.",
      "The new tax regime is now the default and offers a higher ₹75,000 standard deduction and a full rebate up to ₹12 lakh of income. The old regime lets you claim deductions like 80C, 80D, HRA and home loan interest. The right choice depends on how many deductions you actually use.",
    ],
    faqs: [
      {
        q: "Which tax regime is better, old or new?",
        a: "It depends on your deductions. The new regime usually wins if you claim few deductions, thanks to the higher standard deduction and the rebate up to ₹12 lakh. The old regime can win if you fully use 80C, 80D, HRA and home loan interest. This calculator compares both for your numbers.",
      },
      {
        q: "What is the income tax rebate under the new regime for FY 2025-26?",
        a: "Under the new regime for FY 2025-26, a resident individual with total income up to ₹12 lakh pays zero tax due to the Section 87A rebate (plus marginal relief just above ₹12 lakh). Salaried individuals also get a ₹75,000 standard deduction.",
      },
      {
        q: "Is this income tax calculator accurate?",
        a: "It gives a close estimate using the FY 2025-26 slabs, standard deduction, 87A rebate, common surcharge tiers and 4% cess, for resident individuals below 60. Always verify on incometax.gov.in or with a CA before filing — it is not tax advice.",
      },
    ],
  },
  {
    slug: "emi-calculator",
    name: "EMI Calculator",
    h1: "EMI Calculator — Home, Car & Personal Loan",
    metaTitle: "EMI Calculator — Home, Car & Personal Loan EMI",
    description:
      "Free EMI calculator for home, car and personal loans. Enter loan amount, interest rate and tenure to see your monthly EMI, total interest and total repayment.",
    keywords: [
      "emi calculator",
      "home loan emi calculator",
      "car loan emi calculator",
      "personal loan emi calculator",
      "loan emi calculator",
    ],
    intro: [
      "Calculate the monthly EMI on any loan — home, car or personal — with this free EMI calculator. Enter the loan amount, annual interest rate and tenure to instantly see your EMI, the total interest you'll pay, and the total amount repayable.",
      "EMI is calculated on a reducing-balance basis. A longer tenure lowers your monthly EMI but increases the total interest you pay over the life of the loan.",
    ],
    faqs: [
      {
        q: "How is EMI calculated?",
        a: "EMI = P × r × (1+r)^n / ((1+r)^n − 1), where P is the loan amount, r is the monthly interest rate (annual rate ÷ 12 ÷ 100), and n is the number of monthly instalments. This calculator does it for you automatically.",
      },
      {
        q: "Does a longer tenure reduce my EMI?",
        a: "Yes — a longer tenure lowers your monthly EMI, but you end up paying more total interest. A shorter tenure means a higher EMI but lower total interest. Try different tenures above to compare.",
      },
    ],
  },
  {
    slug: "sip-calculator",
    name: "SIP Calculator",
    h1: "SIP Calculator — Mutual Fund Returns",
    metaTitle: "SIP Calculator — Estimate Mutual Fund SIP Returns",
    description:
      "Free SIP calculator to estimate the future value of your monthly mutual fund investments. Enter the monthly amount, expected return and duration to see your wealth.",
    keywords: [
      "sip calculator",
      "mutual fund sip calculator",
      "sip return calculator",
      "sip investment calculator",
    ],
    intro: [
      "Estimate how much your monthly SIP (Systematic Investment Plan) could grow to with this free SIP calculator. Enter your monthly investment, an expected annual return and your time horizon to see the projected value and your total gains.",
      "Thanks to compounding, even small monthly investments can grow substantially over long periods. The longer you stay invested, the larger the share of your final value that comes from returns rather than your own contributions.",
    ],
    faqs: [
      {
        q: "How does a SIP calculator work?",
        a: "It computes the future value of a series of monthly investments using compound growth: FV = P × (((1+i)^n − 1) / i) × (1+i), where P is the monthly amount, i is the monthly return and n is the number of months. Returns are assumed constant for illustration.",
      },
      {
        q: "Are SIP returns guaranteed?",
        a: "No. Mutual fund returns are market-linked and not guaranteed; the rate you enter is only an assumption for illustration. Past performance doesn't guarantee future results. This is not investment advice.",
      },
    ],
  },
  {
    slug: "hra-calculator",
    name: "HRA Calculator",
    h1: "HRA Exemption Calculator",
    metaTitle: "HRA Calculator — House Rent Allowance Exemption",
    description:
      "Free HRA exemption calculator under Section 10(13A). Enter your basic salary, HRA received and rent paid to find your tax-exempt HRA and taxable HRA.",
    keywords: [
      "hra calculator",
      "hra exemption calculator",
      "house rent allowance calculator",
      "hra exemption under section 10 13a",
    ],
    intro: [
      "Calculate your tax-exempt House Rent Allowance (HRA) under Section 10(13A) with this free HRA calculator. Enter your basic salary plus DA, the HRA you receive, and the rent you pay to see how much of your HRA is exempt from tax.",
      "Your HRA exemption is the least of three values: the actual HRA received, rent paid minus 10% of basic salary, or 50% of basic (metro) / 40% (non-metro). HRA exemption applies under the old tax regime only.",
    ],
    faqs: [
      {
        q: "How is HRA exemption calculated?",
        a: "HRA exemption is the least of: (1) actual HRA received, (2) rent paid minus 10% of basic salary plus DA, and (3) 50% of basic for metro cities or 40% for non-metro cities. This calculator works out all three and picks the lowest.",
      },
      {
        q: "Can I claim HRA in the new tax regime?",
        a: "No. The HRA exemption under Section 10(13A) is available only under the old tax regime. If you opt for the new regime, you cannot claim HRA exemption.",
      },
    ],
  },
];

export function getCalc(slug: string): CalcMeta | undefined {
  return CALCS.find((c) => c.slug === slug);
}

export function calcSlugs(): string[] {
  return CALCS.map((c) => c.slug);
}
