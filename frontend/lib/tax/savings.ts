/**
 * Tax Saver engine — answers the real question: "how much LESS tax could I
 * legally pay, and what exactly do I do?"
 *
 * We evaluate concrete levers (80C top-up, extra NPS 80CCD(1B), 80D health
 * cover) cumulatively against BOTH regimes each time, so a saving is only
 * claimed when it genuinely lowers the user's best-case tax. If the new
 * regime stays cheaper even after maxing deductions, we say so honestly —
 * that IS the advice.
 */

import { computeTax, type TaxInput } from "@/lib/calculators/incomeTax";

export type SaverInput = {
  gross: number;
  salaried: boolean;
  ded80c: number;
  ded80d: number;
  nps1b: number;
  npsEmployer2: number;
  hraExempt: number;
  ltaExempt: number;
  otherDeductions: number;
  otherIncome: number;
  tds: number;
};

export type SaverAction = {
  id: string;
  title: string;
  invest: number; // how much more to put in
  saving: number; // tax saved per year
  step: string; // what exactly to do
  note?: string;
};

export type SaverPlan = {
  baselineTax: number;
  baselineRegime: "new" | "old";
  optimizedTax: number;
  optimizedRegime: "new" | "old";
  totalSaving: number;
  actions: SaverAction[];
  alreadyOptimal: boolean;
  employerNpsIdea: { invest: number; saving: number } | null;
  refund: number | null; // vs TDS, at baseline (null if tds not given)
};

function toTaxInput(i: SaverInput, regime: "new" | "old"): TaxInput {
  return {
    regime,
    grossIncome: i.gross + i.otherIncome,
    salaried: i.salaried,
    ded80c: i.ded80c,
    ded80d: i.ded80d,
    hraExempt: i.hraExempt,
    ltaExempt: i.ltaExempt,
    homeLoanInterest: 0,
    otherDeductions: i.nps1b + i.otherDeductions,
    npsEmployer80ccd2: i.npsEmployer2,
  };
}

function best(i: SaverInput): { tax: number; regime: "new" | "old" } {
  const n = computeTax(toTaxInput(i, "new")).totalTax;
  const o = computeTax(toTaxInput(i, "old")).totalTax;
  return n <= o ? { tax: n, regime: "new" } : { tax: o, regime: "old" };
}

export function planSavings(input: SaverInput): SaverPlan {
  const base = best(input);
  const actions: SaverAction[] = [];
  let cur: SaverInput = { ...input };

  const levers: {
    id: string;
    title: string;
    headroom: (s: SaverInput) => number;
    apply: (s: SaverInput, amt: number) => SaverInput;
    step: string;
    note?: string;
  }[] = [
    {
      id: "80c",
      title: "Fill your 80C bucket",
      headroom: (s) => Math.max(0, 150000 - s.ded80c),
      apply: (s, amt) => ({ ...s, ded80c: s.ded80c + amt }),
      step: "Put the amount into ELSS mutual funds, PPF, or a 5-year tax-saver FD before 31 March. Your EPF and life-insurance premiums already count.",
    },
    {
      id: "nps1b",
      title: "Extra ₹50k NPS — Section 80CCD(1B)",
      headroom: (s) => Math.max(0, 50000 - s.nps1b),
      apply: (s, amt) => ({ ...s, nps1b: s.nps1b + amt }),
      step: "Open an NPS account (any bank app or eNPS) and invest before 31 March. This is over and above 80C.",
      note: "Locked till retirement — treat it as your pension pot.",
    },
    {
      id: "80d",
      title: "Health insurance — Section 80D",
      headroom: (s) => Math.max(0, 25000 - s.ded80d),
      apply: (s, amt) => ({ ...s, ded80d: s.ded80d + amt }),
      step: "A family health policy premium is deductible up to ₹25,000 (more for senior-citizen parents) — and you get real cover, not just a tax break.",
    },
  ];

  for (const lever of levers) {
    const room = lever.headroom(cur);
    if (room <= 0) continue;
    const next = lever.apply(cur, room);
    const saving = best(cur).tax - best(next).tax;
    if (saving > 0) {
      actions.push({
        id: lever.id,
        title: lever.title,
        invest: room,
        saving: Math.round(saving),
        step: lever.step,
        note: lever.note,
      });
      cur = next;
    }
  }

  const opt = best(cur);
  const totalSaving = Math.max(0, Math.round(base.tax - opt.tax));

  // Employer NPS (80CCD(2)) — works in BOTH regimes, so it helps even
  // "already optimal on new regime" users. Estimated at 10% of an assumed
  // 40% basic; clearly labelled an estimate in the UI.
  let employerNpsIdea: SaverPlan["employerNpsIdea"] = null;
  if (input.npsEmployer2 <= 0 && input.salaried) {
    const est = Math.min(Math.round(input.gross * 0.4 * 0.1), 750000);
    if (est > 0) {
      const with2 = { ...cur, npsEmployer2: est };
      const saving = Math.round(best(cur).tax - best(with2).tax);
      if (saving > 0) employerNpsIdea = { invest: est, saving };
    }
  }

  return {
    baselineTax: Math.round(base.tax),
    baselineRegime: base.regime,
    optimizedTax: Math.round(opt.tax),
    optimizedRegime: opt.regime,
    totalSaving,
    actions,
    alreadyOptimal: totalSaving === 0,
    employerNpsIdea,
    refund: input.tds > 0 ? Math.round(input.tds - base.tax) : null,
  };
}
