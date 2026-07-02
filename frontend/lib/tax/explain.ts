/**
 * Plain-language tax explainer. Turns the computed numbers into a simple story
 * a first-time taxpayer understands: what you earned, what you're taxed on,
 * what you owe or get back, which regime to pick, and what to do next.
 *
 * Deterministic on purpose — for money/YMYL we never let an LLM restate the
 * figures. The AI in LabhPay reads your Form 16; this turns the result into
 * human language safely.
 */

import type { TaxToolkitInput, TaxToolkitResult } from "@/lib/tax/analyze";

function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/** Friendly lakh phrasing for large amounts, e.g. "₹25.4 lakh". */
function lakh(n: number): string {
  if (n >= 100000) {
    const l = n / 100000;
    return `₹${l.toFixed(l >= 10 ? 1 : 2)} lakh`;
  }
  return inr(n);
}

export type Story = { label: string; plain: string; tone?: "good" | "bad" };

export type TaxExplanation = {
  owe: boolean;
  gap: number;
  bottomLine: string;
  story: Story[];
  verdict: string;
  verdictReason: string;
  note: string;
  nextSteps: string[];
};

export function explainTax(
  input: TaxToolkitInput,
  r: TaxToolkitResult
): TaxExplanation {
  const owe = r.refund < 0;
  const gap = Math.abs(r.refund);
  const rec = r.recommended;
  const recR = rec === "new" ? r.newRegime : r.oldRegime;
  const regimeName = rec === "new" ? "New Regime" : "Old Regime";
  const otherName = rec === "new" ? "Old Regime" : "New Regime";

  const bottomLine = owe
    ? `When you file your return, you'll need to pay ${inr(gap)} more.`
    : gap > 0
    ? `When you file your return, you should get ${inr(gap)} back as a refund.`
    : `Your tax is fully covered — nothing more to pay, nothing to claim back.`;

  const story: Story[] = [
    {
      label: "You earned",
      plain: `${inr(r.gross)} this year (your full salary, including any perks).`,
    },
    {
      label: "You're taxed on",
      plain:
        rec === "new"
          ? `${inr(recR.taxableIncome)} — your salary minus the standard deduction${
              input.npsEmployer80ccd2 > 0 ? " and your employer's NPS contribution" : ""
            }.`
          : `${inr(recR.taxableIncome)} — your salary minus the standard deduction and your deductions (80C, 80D${
              input.npsEmployer80ccd2 > 0 ? ", employer NPS" : ""
            }, etc.).`,
    },
    {
      label: "Your tax for the year",
      plain: `${inr(recR.totalTax)}, including the 4% health & education cess.`,
    },
    {
      label: "Already paid",
      plain: `${inr(r.tds)} — your employer deducted this from your salary through the year (this is your “TDS”).`,
    },
    owe
      ? {
          label: "Still to pay",
          plain: `${inr(
            gap
          )}. The tax taken from your salary fell a little short of your final tax — common when you have perks, a bonus, or other income.`,
          tone: "bad",
        }
      : {
          label: "Refund due to you",
          plain: `${inr(
            gap
          )}. More tax was deducted than you actually owed, so you get the difference back.`,
          tone: "good",
        },
  ];

  const verdict = `Go with the ${regimeName} — it's ${inr(
    r.regimeSaving
  )} cheaper for you than the ${otherName}.`;
  const verdictReason =
    rec === "new"
      ? `At your income level, the new regime's lower tax rates beat claiming deductions.`
      : `Your deductions (80C, 80D, HRA and so on) save you more than the new regime's lower rates do.`;

  const hasExempt = (input.hraExempt || 0) + (input.ltaExempt || 0) > 0;
  const note =
    rec === "new"
      ? hasExempt
        ? `Under the New Regime, exemptions like HRA and LTC/LTA don't apply — so those were taxed. We still compared both regimes (crediting the Old Regime with your HRA and LTC), and the New Regime is cheaper for you overall, so it's the right pick.`
        : `Under the New Regime, things like 80C, HRA and LTC/LTA don't reduce your tax — that's the trade-off. If you have HRA or LTC you could claim, add them on the left to double-check the Old Regime; for you, the New Regime still wins.`
      : `You're claiming deductions and exemptions (HRA, LTC, 80C…) that genuinely help under the Old Regime. Check below for any you might still be missing.`;

  const nextSteps: string[] = [
    `File your ${r.itrForm} return at incometax.gov.in by the deadline (usually 31 July).`,
    `Pick the ${regimeName} when you file.`,
    owe
      ? `Pay ${inr(gap)} as “self-assessment tax” on the portal before you file.`
      : gap > 0
      ? `Your ${inr(gap)} refund is credited to your bank account a few weeks after filing.`
      : `Nothing extra to pay or claim — just file.`,
    `Open your AIS on the portal and check nothing is missing — bank interest, dividends, or sold shares often need to be added.`,
  ];
  if (r.hasCapitalGains) {
    nextSteps.splice(
      1,
      0,
      `You have capital gains — these are taxed at special rates (not in the figure above), so you must file ITR-2. Consider a CA for this part.`
    );
  }

  return { owe, gap, bottomLine, story, verdict, verdictReason, note, nextSteps };
}
