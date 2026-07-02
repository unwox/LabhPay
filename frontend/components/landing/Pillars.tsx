import Link from "next/link";
import { FileText, Calculator, Receipt, ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

/**
 * Communicates the broader "financial co-pilot" vision on the landing page —
 * what LabhPay does today (Statement Intelligence + Calculators, both live) and
 * what's next (Tax Toolkit). Honest labelling: live vs coming soon.
 */
export function Pillars() {
  return (
    <section className="px-[var(--site-gutter)] py-16 md:py-24 max-w-site mx-auto">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
          One private app, your whole money life
        </p>
        <h2 className="mt-3 font-display text-display-sm md:text-4xl text-ink">
          More than a credit card tool.
        </h2>
        <p className="mt-3 text-ink-soft text-lg">
          LabhPay is becoming your private financial co-pilot for India — upload a
          document or run a quick calculation, and get clarity in seconds. Nothing
          is stored; everything is auto-deleted after your session.
        </p>
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-4 md:gap-6">
        <Reveal delay={0}>
          <Card
            icon={FileText}
            tag="Live"
            title="Statement Intelligence"
            body="Upload a credit card or bank statement and instantly see hidden charges, recurring subscriptions, EMIs and where every rupee went."
            href="/dashboard?upload=1"
            cta="Analyze a statement"
          />
        </Reveal>
        <Reveal delay={120}>
          <Card
            icon={Receipt}
            tag="Live"
            title="Tax Toolkit"
            body="Upload your Form 16 to compare the old vs new regime, estimate your refund, spot missed deductions and get an ITR-ready summary."
            href="/tax"
            cta="Open Tax Toolkit"
          />
        </Reveal>
        <Reveal delay={240}>
          <Card
            icon={Calculator}
            tag="Live"
            title="Free Calculators"
            body="Income tax (old vs new regime), home & car loan EMI, mutual fund SIP returns and HRA exemption — fast, accurate, no sign-up."
            href="/calculators"
            cta="Open calculators"
          />
        </Reveal>
      </div>
    </section>
  );
}

function Card({
  icon: Icon,
  tag,
  title,
  body,
  href,
  cta,
  soon,
}: {
  icon: typeof FileText;
  tag: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  soon?: boolean;
}) {
  return (
    <div className="h-full rounded-3xl bg-paper-card shadow-card-sm p-6 md:p-7 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-card-xl">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-mist text-accent-ink">
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <span
          className={`text-[10px] uppercase tracking-eyebrow px-2 py-1 rounded-full ${
            soon ? "bg-paper-warm text-ink-muted" : "bg-accent-mist text-accent-ink"
          }`}
        >
          {tag}
        </span>
      </div>
      <p className="mt-4 font-display text-xl text-ink">{title}</p>
      <p className="mt-2 text-[15px] text-ink-soft leading-relaxed flex-1">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline underline-offset-4"
      >
        {cta} <ArrowRight size={14} />
      </Link>
    </div>
  );
}
