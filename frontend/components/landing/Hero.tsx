import Link from "next/link";
import { FileText, Receipt, Calculator, ArrowUpRight } from "lucide-react";
import { Section, Eyebrow } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <Section size="xl" bleed className="overflow-hidden pt-32 md:pt-36 bg-ivory-fade">
      {/* Decorative emerald glow */}
      <div
        aria-hidden
        className="orb"
        style={{
          background:
            "radial-gradient(closest-side, rgba(14,92,73,0.18), rgba(14,92,73,0))",
          width: 560,
          height: 560,
          top: -140,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      <div className="mx-auto max-w-site px-[var(--site-gutter)] grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Copy */}
        <div className="lg:col-span-6 relative animate-fade-rise">
          <Eyebrow>Privacy-first · Made for India</Eyebrow>
          <h1 className="mt-5 font-display text-display-md md:text-display-lg lg:text-display-xl text-ink">
            Find the money you&rsquo;re <em className="italic text-accent">losing</em>.
          </h1>
          <p className="mt-6 max-w-xl text-lg md:text-xl text-ink-soft leading-relaxed">
            Upload one statement and LabhPay shows you exactly where your money
            leaks &mdash; interest, hidden fees, forgotten subscriptions &mdash; and
            how to get it back. Private, and auto-deleted after your session.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/dashboard?upload=1">
              <Button variant="primary" size="lg">
                Analyze a statement
              </Button>
            </Link>
            <Link href="/tax">
              <Button variant="outline" size="lg">
                Try the Tax Toolkit
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-ink-muted">
            Statements · Tax &amp; Form 16 · Income-tax, EMI, SIP &amp; HRA calculators
          </p>
        </div>

        {/* Floating capability cards */}
        <div className="lg:col-span-6 relative h-[440px] md:h-[500px]">
          <FloatCard
            className="right-0 md:right-4 top-2"
            delay="0.15s"
            tilt="-5deg"
            tone="ink"
            icon={FileText}
            tag="Statement Intelligence"
            title="Hidden charges found"
            big="₹2,142"
            rows={[
              ["Finance / interest", "₹1,998"],
              ["GST on charges", "₹144"],
            ]}
          />
          <FloatCard
            className="left-0 md:left-2 top-36 md:top-40"
            delay="0.5s"
            tilt="4deg"
            tone="emerald"
            icon={Receipt}
            tag="Tax Toolkit · Form 16"
            title="New regime — refund due"
            big="₹18,400"
            rows={[
              ["New regime tax", "₹71,600"],
              ["You saved vs old", "₹46,800"],
            ]}
          />
          <FloatCard
            className="right-6 md:right-16 top-[19rem] md:top-[21rem]"
            delay="0.85s"
            tilt="-2deg"
            tone="paper"
            icon={Calculator}
            tag="EMI Calculator"
            title="₹30L home loan · 20y"
            big="₹26,035"
            rows={[["per month", "8.5% p.a."]]}
          />
        </div>
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
  big,
  rows,
}: {
  className: string;
  delay: string;
  tilt: string;
  tone: "ink" | "emerald" | "paper";
  icon: typeof FileText;
  tag: string;
  title: string;
  big: string;
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
    <div className={`absolute w-[260px] md:w-[300px] animate-fade-rise ${className}`} style={{ animationDelay: delay } as React.CSSProperties}>
      <div className="animate-float-slow" style={{ animationDelay: delay } as React.CSSProperties}>
        <div
          className={`rounded-3xl shadow-card-xl p-5 ${toneCls}`}
          style={{ transform: `rotate(${tilt})` }}
        >
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-eyebrow px-2 py-1 rounded-full ${chip}`}>
              <Icon size={12} /> {tag}
            </span>
            <ArrowUpRight size={16} className={sub} />
          </div>
          <p className={`mt-4 text-sm ${sub}`}>{title}</p>
          <p className="mt-1 font-display text-4xl tabular-nums">{big}</p>
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
