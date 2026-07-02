import Link from "next/link";
import { FileText, Receipt, Calculator, ArrowUpRight } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";

export function Hero() {
  return (
    <Section size="xl" bleed className="overflow-hidden pt-32 md:pt-40 pb-10 bg-ivory-fade">
      {/* Drifting depth orbs */}
      <div
        aria-hidden
        className="orb orb-drift"
        style={{
          background: "radial-gradient(closest-side, rgba(14,92,73,0.20), rgba(14,92,73,0))",
          width: 620, height: 620, top: -160, left: "58%",
        }}
      />
      <div
        aria-hidden
        className="orb orb-drift-slow"
        style={{
          background: "radial-gradient(closest-side, rgba(37,99,235,0.10), rgba(37,99,235,0))",
          width: 480, height: 480, top: 220, left: "-6%",
        }}
      />

      <div className="mx-auto max-w-site px-[var(--site-gutter)] grid lg:grid-cols-12 gap-14 lg:gap-8 items-center">
        {/* Copy — staggered entrance */}
        <div className="lg:col-span-6 relative">
          <p
            className="animate-fade-rise inline-flex items-center gap-2 rounded-full border border-ink/10 bg-paper-card/70 px-3.5 py-1.5 text-[12px] text-ink-soft"
            style={{ animationDelay: "0ms" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Privacy-first · Auto-deleted after your session
          </p>

          <h1
            className="animate-fade-rise mt-6 font-display text-display-md md:text-display-lg lg:text-display-xl text-ink leading-[0.98]"
            style={{ animationDelay: "90ms" }}
          >
            Find the money
            <br />
            you&rsquo;re <span className="text-gradient-accent">losing</span>.
          </h1>

          <p
            className="animate-fade-rise mt-6 max-w-xl text-lg md:text-xl text-ink-soft leading-relaxed"
            style={{ animationDelay: "180ms" }}
          >
            Upload one statement and LabhPay shows exactly where your money
            leaks — interest, hidden fees, forgotten subscriptions — and how to
            get it back. Taxes and calculators included.
          </p>

          <div
            className="animate-fade-rise mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "270ms" }}
          >
            <Link href="/dashboard?upload=1">
              <Button variant="primary" size="lg">
                Analyze a statement
              </Button>
            </Link>
            <Link href="/tax">
              <Button variant="outline" size="lg">
                Cut my tax bill
              </Button>
            </Link>
          </div>

          <p
            className="animate-fade-rise mt-7 text-sm text-ink-muted"
            style={{ animationDelay: "360ms" }}
          >
            Statements · Form 16 &amp; taxes · Income-tax, EMI, SIP &amp; HRA calculators
          </p>
        </div>

        {/* Floating result cards with live counters */}
        <div className="lg:col-span-6 relative h-[460px] md:h-[520px]">
          <FloatCard
            className="right-0 md:right-4 top-2"
            delay="150ms"
            tilt="-5deg"
            tone="ink"
            icon={FileText}
            tag="Statement Intelligence"
            title="Hidden charges found"
            value={2142}
            rows={[["Finance / interest", "₹1,998"], ["GST on charges", "₹144"]]}
          />
          <FloatCard
            className="left-0 md:left-2 top-40 md:top-44"
            delay="450ms"
            tilt="4deg"
            tone="emerald"
            icon={Receipt}
            tag="Tax Saver · Form 16"
            title="You could still save"
            value={46800}
            rows={[["New regime tax", "₹71,600"], ["Saved vs old", "₹46,800"]]}
          />
          <FloatCard
            className="right-6 md:right-16 top-[20.5rem] md:top-[22.5rem]"
            delay="750ms"
            tilt="-2deg"
            tone="paper"
            icon={Calculator}
            tag="EMI Calculator"
            title="₹30L home loan · 20y"
            value={26035}
            rows={[["per month", "8.5% p.a."]]}
          />
        </div>
      </div>

      {/* Scroll cue */}
      <div className="relative mt-10 hidden md:flex justify-center text-ink-muted">
        <span className="scroll-cue" aria-hidden />
      </div>
    </Section>
  );
}

function FloatCard({
  className,
  delay,
  tilt,
  tone,
  icon: Icon,
  tag,
  title,
  value,
  rows,
}: {
  className: string;
  delay: string;
  tilt: string;
  tone: "ink" | "emerald" | "paper";
  icon: typeof FileText;
  tag: string;
  title: string;
  value: number;
  rows: [string, string][];
}) {
  const toneCls =
    tone === "ink"
      ? "bg-paper-ink text-paper"
      : tone === "emerald"
      ? "bg-accent text-paper"
      : "bg-paper-card text-ink";
  const sub = tone === "paper" ? "text-ink-muted" : "text-paper/70";
  const chip = tone === "paper" ? "bg-accent-mist text-accent-ink" : "bg-white/15 text-paper";
  const rowBorder = tone === "paper" ? "border-ink/8" : "border-white/15";

  return (
    <div
      className={`absolute w-[264px] md:w-[304px] animate-fade-rise ${className}`}
      style={{ animationDelay: delay } as React.CSSProperties}
    >
      <div className="animate-float-slow" style={{ animationDelay: delay } as React.CSSProperties}>
        <div
          className={`rounded-3xl shadow-card-xl p-5 transition-transform duration-500 hover:scale-[1.03] hover:rotate-0 ${toneCls}`}
          style={{ transform: `rotate(${tilt})` }}
        >
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-eyebrow px-2 py-1 rounded-full ${chip}`}>
              <Icon size={12} /> {tag}
            </span>
            <ArrowUpRight size={16} className={sub} />
          </div>
          <p className={`mt-4 text-sm ${sub}`}>{title}</p>
          <p className="mt-1 font-display text-4xl tabular-nums">
            <CountUp value={value} prefix="₹" duration={1400} />
          </p>
          <div className={`mt-4 border-t ${rowBorder} pt-2 space-y-1.5`}>
            {rows.map(([l, r], i) => (
              <div key={i} className="flex items-center justify-between text-[13px]">
                <span className={sub}>{l}</span>
                <span className="tabular-nums">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
