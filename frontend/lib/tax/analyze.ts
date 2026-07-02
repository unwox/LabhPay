/**
 * Tax Toolkit analysis — wraps the FY 2025-26 slab engine to produce the
 * full picture a Form 16 holder needs: old vs new regime, the recommended
 * regime, refund-or-payable against TDS already deducted, and a list of
 * deductions they may be missing. Pure + client-side — nothing is stored.
 */

import { computeTax, FY_LABEL, type TaxResult } from "@/lib/calculators/incomeTax";

export type TaxToolkitInput = {
  grossSalary: number;
  otherIncome: number;
  salaried: boolean;
  tdsPaid: number; // tax already deducted (from Form 16 / 26AS)
  ded80c: number;
  ded80d: number;
  hraExempt: number;
  ltaExempt: number; // LTA/LTC exemption, old regime only
  homeLoanInterest: number;
  nps80ccd1b: number; // employee's own NPS, 80CCD(1B), old regime only
  npsEmployer80ccd2: number; // employer NPS, 80CCD(2), BOTH regimes
  otherDeductions: number;
  capitalGains: number; // taxed at special rates — flagged, not computed here
};

export type MissedDeduction = {
  code: string;
  label: string;
  used: number;
  limit: number;
  headroom: number;
  potentialSaving: number; // at the old-regime marginal rate
  note: string;
};

export type TaxToolkitResult = {
  fy: string;
  gross: number;
  newRegime: TaxResult;
  oldRegime: TaxResult;
  recommended: "new" | "old";
  recommendedTax: number;
  regimeSaving: number; // how much the better regime saves vs the other
  tds: number;
  refund: number; // >0 = refund due to you; <0 = you owe more
  missed: MissedDeduction[];
  hasCapitalGains: boolean;
  itrForm: "ITR-1" | "ITR-2";
};

// Marginal rate for "potential saving" hints, based on old-regime taxable income.
function oldMarginalRate(taxable: number): number {
  if (taxable > 1000000) return 0.3;
  if (taxable > 500000) return 0.2;
  if (taxable > 250000) return 0.05;
  return 0;
}

export function analyzeTax(i: TaxToolkitInput): TaxToolkitResult {
  const gross = i.grossSalary + i.otherIncome;

  const common = {
    grossIncome: gross,
    salaried: i.salaried,
    ded80c: i.ded80c,
    ded80d: i.ded80d,
    hraExempt: i.hraExempt,
    ltaExempt: i.ltaExempt,
    homeLoanInterest: i.homeLoanInterest,
    // NPS 80CCD(1B) and "other" both reduce old-regime taxable income.
    otherDeductions: i.nps80ccd1b + i.otherDeductions,
    // Employer NPS 80CCD(2) — reduces taxable income in BOTH regimes.
    npsEmployer80ccd2: i.npsEmployer80ccd2,
  };

  const newRegime = computeTax({ ...common, regime: "new" });
  const oldRegime = computeTax({ ...common, regime: "old" });

  const recommended = newRegime.totalTax <= oldRegime.totalTax ? "new" : "old";
  const recommendedTax = Math.min(newRegime.totalTax, oldRegime.totalTax);
  const regimeSaving = Math.abs(newRegime.totalTax - oldRegime.totalTax);
  const refund = i.tdsPaid - recommendedTax;

  // Missed-deduction hints (old-regime levers). Shown as education, not advice.
  const rate = oldMarginalRate(oldRegime.taxableIncome + (i.ded80c + i.nps80ccd1b)); // pre-deduction-ish
  const missed: MissedDeduction[] = [];
  const add = (code: string, label: string, used: number, limit: number, note: string) => {
    const headroom = Math.max(0, limit - used);
    if (headroom > 0) {
      missed.push({
        code,
        label,
        used,
        limit,
        headroom,
        potentialSaving: Math.round(headroom * rate),
        note,
      });
    }
  };
  add("80C", "Section 80C", Math.min(i.ded80c, 150000), 150000, "EPF, PPF, ELSS, life insurance, principal on home loan, tuition fees.");
  add("80CCD(1B)", "NPS — Section 80CCD(1B)", Math.min(i.nps80ccd1b, 50000), 50000, "An extra ₹50,000 deduction for NPS, over and above 80C.");
  add("80D", "Health insurance — Section 80D", Math.min(i.ded80d, 25000), 25000, "Premiums for self/family (₹25,000), more if you/parents are senior citizens.");

  // Which ITR form (common salaried cases). Capital gains or income above
  // ₹50 lakh push you from ITR-1 to ITR-2.
  const hasCapitalGains = (i.capitalGains || 0) > 0;
  const itrForm: "ITR-1" | "ITR-2" =
    hasCapitalGains || gross > 5000000 ? "ITR-2" : "ITR-1";

  return {
    fy: FY_LABEL,
    gross,
    newRegime,
    oldRegime,
    recommended,
    recommendedTax,
    regimeSaving,
    tds: i.tdsPaid,
    refund,
    missed,
    hasCapitalGains,
    itrForm,
  };
}
