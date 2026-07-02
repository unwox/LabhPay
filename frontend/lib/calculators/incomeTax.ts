/**
 * Indian income-tax estimator — FY 2025-26 (AY 2026-27), individuals below 60.
 *
 * IMPORTANT (site owner): tax slabs/rebates change every Union Budget. These
 * are the FY 2025-26 (post Budget 2025) figures. Verify against
 * incometax.gov.in before relying on them, and update FY_LABEL + slabs when
 * they change. Edge cases (senior-citizen slabs, full marginal-relief on
 * surcharge, special-rate incomes) are intentionally simplified — this is an
 * estimate, not a filing.
 */

export const FY_LABEL = "FY 2025-26 (AY 2026-27)";

export type Regime = "new" | "old";

export type TaxInput = {
  regime: Regime;
  grossIncome: number; // annual gross (salary) income
  salaried: boolean; // eligible for standard deduction
  // Old-regime deductions (ignored for the new regime):
  ded80c?: number;
  ded80d?: number;
  hraExempt?: number;
  ltaExempt?: number; // LTA/LTC exemption u/s 10(5) — old regime only
  homeLoanInterest?: number;
  otherDeductions?: number;
  // Employer NPS contribution u/s 80CCD(2): deductible in BOTH regimes
  // (unlike the deductions above). Commonly ~10% of basic for corporate NPS.
  npsEmployer80ccd2?: number;
};

export type TaxResult = {
  regime: Regime;
  fy: string;
  taxableIncome: number;
  standardDeduction: number;
  totalDeductions: number;
  baseTax: number; // before rebate
  rebate: number;
  surcharge: number;
  cess: number;
  totalTax: number; // payable
  effectiveRate: number; // % of gross
  slabs: { range: string; rate: string; tax: number }[];
};

type Slab = { upTo: number; rate: number };

// On income AFTER applicable deductions.
const NEW_SLABS: Slab[] = [
  { upTo: 400000, rate: 0 },
  { upTo: 800000, rate: 0.05 },
  { upTo: 1200000, rate: 0.1 },
  { upTo: 1600000, rate: 0.15 },
  { upTo: 2000000, rate: 0.2 },
  { upTo: 2400000, rate: 0.25 },
  { upTo: Infinity, rate: 0.3 },
];

const OLD_SLABS: Slab[] = [
  { upTo: 250000, rate: 0 },
  { upTo: 500000, rate: 0.2 / 4 }, // 5%
  { upTo: 1000000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
];

function applySlabs(income: number, slabs: Slab[]) {
  let prev = 0;
  let tax = 0;
  const rows: { range: string; rate: string; tax: number }[] = [];
  for (const s of slabs) {
    if (income <= prev) break;
    const chunk = Math.min(income, s.upTo) - prev;
    const t = chunk * s.rate;
    if (chunk > 0 && s.rate > 0) {
      rows.push({
        range: `₹${fmt(prev)} – ${s.upTo === Infinity ? "above" : "₹" + fmt(s.upTo)}`,
        rate: `${Math.round(s.rate * 100)}%`,
        tax: Math.round(t),
      });
    }
    tax += t;
    prev = s.upTo;
  }
  return { tax, rows };
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN");
}

function surchargeFor(taxableIncome: number, baseTax: number, regime: Regime): number {
  // Common surcharge tiers. New regime caps surcharge at 25%.
  let rate = 0;
  if (taxableIncome > 20000000) rate = regime === "new" ? 0.25 : 0.37;
  else if (taxableIncome > 10000000) rate = 0.15;
  else if (taxableIncome > 5000000) rate = 0.1;
  if (regime === "new" && rate > 0.25) rate = 0.25;
  return baseTax * rate;
}

export function computeTax(input: TaxInput): TaxResult {
  const { regime, grossIncome, salaried } = input;
  const isNew = regime === "new";

  const standardDeduction = salaried ? (isNew ? 75000 : 50000) : 0;

  // Employer NPS u/s 80CCD(2) is allowed under BOTH regimes.
  const nps2 = input.npsEmployer80ccd2 ?? 0;

  let otherDed = nps2;
  if (!isNew) {
    otherDed +=
      Math.min(input.ded80c ?? 0, 150000) +
      (input.ded80d ?? 0) +
      (input.hraExempt ?? 0) +
      (input.ltaExempt ?? 0) +
      Math.min(input.homeLoanInterest ?? 0, 200000) +
      (input.otherDeductions ?? 0);
  }

  const totalDeductions = standardDeduction + otherDed;
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);

  const slabs = isNew ? NEW_SLABS : OLD_SLABS;
  const { tax: baseTax, rows } = applySlabs(taxableIncome, slabs);

  // Section 87A rebate.
  let rebate = 0;
  if (isNew) {
    if (taxableIncome <= 1200000) rebate = baseTax;
    else {
      // Marginal relief: tax can't exceed income above ₹12L.
      const excess = taxableIncome - 1200000;
      if (baseTax > excess) rebate = baseTax - excess;
    }
  } else {
    if (taxableIncome <= 500000) rebate = baseTax;
  }

  const taxAfterRebate = Math.max(0, baseTax - rebate);
  const surcharge = surchargeFor(taxableIncome, taxAfterRebate, regime);
  const cess = (taxAfterRebate + surcharge) * 0.04;
  const totalTax = Math.round(taxAfterRebate + surcharge + cess);
  const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;

  return {
    regime,
    fy: FY_LABEL,
    taxableIncome: Math.round(taxableIncome),
    standardDeduction,
    totalDeductions: Math.round(totalDeductions),
    baseTax: Math.round(baseTax),
    rebate: Math.round(rebate),
    surcharge: Math.round(surcharge),
    cess: Math.round(cess),
    totalTax,
    effectiveRate: Math.round(effectiveRate * 10) / 10,
    slabs: rows,
  };
}
