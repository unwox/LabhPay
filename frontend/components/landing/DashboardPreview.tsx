import { Section, Eyebrow, SectionTitle, SectionLede } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { TrendingDown, TrendingUp, Coffee, ShoppingBag, Plane } from "lucide-react";

export function DashboardPreview() {
  return (
    <Section size="lg">
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        <div className="lg:col-span-5">
          <Eyebrow>Spending Intelligence</Eyebrow>
          <SectionTitle className="mt-4">
            A calm view of every <em className="not-italic text-accent">rupee</em>.
          </SectionTitle>
          <SectionLede className="mt-5">
            Statements normalised across banks. Categories you actually
            recognise. Trends that explain themselves. No spreadsheets, no
            jargon, no clutter &mdash; just clarity.
          </SectionLede>
        </div>

        {/* Mock dashboard */}
        <div className="lg:col-span-7 relative">
          <div
            aria-hidden
            className="orb"
            style={{
              background:
                "radial-gradient(closest-side, rgba(184,134,90,0.22), rgba(184,134,90,0))",
              width: 360,
              height: 360,
              top: -40,
              right: -40,
            }}
          />
          <Card elevation="xl" className="relative p-6 md:p-8 space-y-6">
            {/* Topline */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                  This month · HDFC •••• 4218
                </p>
                <p className="mt-2 font-display text-4xl md:text-5xl text-ink leading-none">
                  ₹ 48,290
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-accent-ink bg-accent-soft px-2.5 py-1 rounded-full">
                <TrendingDown size={14} strokeWidth={2} /> 8% vs last month
              </span>
            </div>

            {/* Spend bars */}
            <div>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-eyebrow text-ink-muted">
                <span>Where it went</span>
                <span>5 categories</span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-paper-warm flex">
                <span className="bg-ink"    style={{ width: "34%" }} />
                <span className="bg-accent" style={{ width: "22%" }} />
                <span className="bg-gold"   style={{ width: "18%" }} />
                <span className="bg-ink-muted/70" style={{ width: "14%" }} />
                <span className="bg-ink-faint" style={{ width: "12%" }} />
              </div>
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-3 text-[12px]">
                <Legend dot="bg-ink"    label="Shopping" amt="₹ 16,420" />
                <Legend dot="bg-accent" label="Food"     amt="₹ 10,612" />
                <Legend dot="bg-gold"   label="Travel"   amt="₹ 8,690" />
                <Legend dot="bg-ink-muted/70" label="Groceries" amt="₹ 6,750" />
                <Legend dot="bg-ink-faint"    label="Other"     amt="₹ 5,818" />
              </div>
            </div>

            {/* Top merchants */}
            <div className="grid grid-cols-3 gap-3">
              <Merchant icon={Coffee}     name="Swiggy"  amt="₹ 4,210" delta="+32%" up />
              <Merchant icon={ShoppingBag} name="Amazon" amt="₹ 9,840" delta="-12%" />
              <Merchant icon={Plane}      name="IndiGo"  amt="₹ 6,560" delta="+8%" up />
            </div>

            {/* Footer stats */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-ink/8">
              <StatTile label="Subscriptions" value="6" hint="₹ 1,948/mo" />
              <StatTile label="Hidden charges" value="₹ 320" hint="GST + finance" />
              <StatTile label="Reward points" value="2,148" hint="≈ ₹ 537" />
            </div>
          </Card>
        </div>
      </div>
    </Section>
  );
}

function Legend({ dot, label, amt }: { dot: string; label: string; amt: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
      <div className="leading-tight">
        <p className="text-ink">{label}</p>
        <p className="text-ink-muted text-[11px]">{amt}</p>
      </div>
    </div>
  );
}

function Merchant({
  icon: Icon,
  name,
  amt,
  delta,
  up,
}: {
  icon: React.ComponentType<any>;
  name: string;
  amt: string;
  delta: string;
  up?: boolean;
}) {
  return (
    <div className="rounded-xl bg-paper-warm/60 p-3">
      <div className="flex items-center gap-2 text-ink">
        <Icon size={14} strokeWidth={1.75} />
        <span className="text-sm">{name}</span>
      </div>
      <p className="mt-1.5 font-display text-lg text-ink leading-none">{amt}</p>
      <p
        className={`mt-1 inline-flex items-center gap-1 text-[11px] ${
          up ? "text-gold" : "text-accent-ink"
        }`}
      >
        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {delta}
      </p>
    </div>
  );
}
