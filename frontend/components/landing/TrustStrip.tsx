import { ShieldCheck, Lock, MapPin } from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    title: "Auto-deleted",
    body: "Statements vanish from our systems the moment your session ends.",
  },
  {
    icon: Lock,
    title: "Never used for training",
    body: "Your financial data is never used to train models, retargeted, or resold.",
  },
  {
    icon: MapPin,
    title: "Built for India",
    body: "Indian banks, Indian merchants, INR-only, GST-aware insights.",
  },
];

export function TrustStrip() {
  return (
    <div className="mx-auto max-w-site px-[var(--site-gutter)]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {items.map((it) => (
          <div
            key={it.title}
            className="rounded-2xl bg-paper-card p-5 md:p-6 shadow-card-sm flex items-start gap-4"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <it.icon size={18} strokeWidth={1.75} />
            </span>
            <div>
              <p className="font-display text-lg text-ink leading-tight">
                {it.title}
              </p>
              <p className="mt-1 text-sm text-ink-soft leading-relaxed">
                {it.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
