import Link from "next/link";
import { FileSearch, Receipt, Calculator, ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

/**
 * The core "what LabhPay does" section — one rich, editorial row per pillar,
 * with a calm mini-visual of the actual result. Replaces the old heavy
 * credit-card dashboard mockups; scans in seconds and covers the full product.
 */
export function Features() {
  return (
    <section className="px-[var(--site-gutter)] py-20 md:py-28 max-w-site mx-auto">
      <Reveal>
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            One private app
          </p>
          <h2 className="mt-3 font-display text-display-sm md:text-5xl text-ink leading-[1.05]">
            Everything for your money, in one place.
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Statements, taxes, and the tools in between — read securely and
            auto-deleted after your session.
          </p>
        </div>
      </Reveal>

      <div className="mt-16 md:mt-20 space-y-20 md:space-y-28">
        <Row
          icon={FileSearch}
          eyebrow="Statement Intelligence"
          title="Find the money you're losing."
          body="Upload a credit card or bank statement and LabhPay surfaces the interest, hidden fees and forgotten subscriptions draining you — each with one clear thing to do about it."
          href="/dashboard?upload=1"
          cta="Analyze a statement"
          visual={
            <MiniCard tone="ink" tag="Money leaks · SBI Card" big="₹4,290" bigNote="leaked this cycle" rows={[["Interest & GST", "₹1,998"], ["3 subscriptions", "₹899/mo"]]} />
          }
        />
        <Row
          reverse
          icon={Receipt}
          eyebrow="Tax Toolkit"
          title="Your Form 16, in plain English."
          body="Upload your Form 16, payslip and 26AS — we read them all. Compare old vs new regime, see your refund or what you owe, and download an ITR-ready summary."
          href="/tax"
          cta="Open the Tax Toolkit"
          visual={
            <MiniCard tone="emerald" tag="Tax Toolkit · FY 2025-26" big="₹18,400" bigNote="refund due to you" rows={[["New regime tax", "₹71,600"], ["Saved vs old", "₹46,800"]]} />
          }
        />
        <Row
          icon={Calculator}
          eyebrow="Free Calculators"
          title="Answers in seconds."
          body="Income tax (old vs new), home & car loan EMI, mutual fund SIP returns and HRA exemption. Free, instant, and no sign-up required."
          href="/calculators"
          cta="Open the calculators"
          visual={
            <MiniCard tone="paper" tag="EMI Calculator" big="₹26,035" bigNote="per month" rows={[["₹30L home loan", "8.5% p.a."], ["Total interest", "₹32.5L"]]} />
          }
        />
      </div>
    </section>
  );
}

function Row({
  icon: Icon,
  eyebrow,
  title,
  body,
  href,
  cta,
  visual,
  reverse,
}: {
  icon: typeof FileSearch;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <Reveal className={reverse ? "lg:order-2" : ""}>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-mist text-accent-ink">
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {eyebrow}
        </p>
        <h3 className="mt-2 font-display text-3xl md:text-4xl text-ink leading-tight">
          {title}
        </h3>
        <p className="mt-4 text-lg text-ink-soft leading-relaxed max-w-xl">{body}</p>
        <Link
          href={href}
          className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-accent-ink hover:gap-2.5 transition-all"
        >
          {cta} <ArrowRight size={16} />
        </Link>
      </Reveal>
      <Reveal delay={120} className={reverse ? "lg:order-1" : ""}>
        <div className="grid place-items-center">{visual}</div>
      </Reveal>
    </div>
  );
}

function MiniCard({
  tone,
  tag,
  big,
  bigNote,
  rows,
}: {
  tone: "ink" | "emerald" | "paper";
  tag: string;
  big: string;
  bigNote: string;
  rows: [string, string][];
}) {
  const cls =
    tone === "ink"
      ? "bg-paper-ink text-paper"
      : tone === "emerald"
      ? "bg-accent text-paper"
      : "bg-paper-card text-ink";
  const sub = tone === "paper" ? "text-ink-muted" : "text-paper/70";
  const chip = tone === "paper" ? "bg-accent-mist text-accent-ink" : "bg-white/15 text-paper";
  const border = tone === "paper" ? "border-ink/8" : "border-white/15";
  return (
    <div className={`w-full max-w-sm rounded-3xl shadow-card-xl p-7 ${cls}`}>
      <span className={`inline-flex text-[10px] uppercase tracking-eyebrow px-2.5 py-1 rounded-full ${chip}`}>
        {tag}
      </span>
      <p className="mt-6 font-display text-5xl tabular-nums leading-none">{big}</p>
      <p className={`mt-2 text-sm ${sub}`}>{bigNote}</p>
      <div className={`mt-6 border-t ${border} pt-3 space-y-2`}>
        {rows.map(([l, r], i) => (
          <div key={i} className="flex items-center justify-between text-[14px]">
            <span className={sub}>{l}</span>
            <span className="tabular-nums">{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
