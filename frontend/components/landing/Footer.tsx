import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="border-t border-ink/8 bg-paper">
      <div className="mx-auto max-w-site px-[var(--site-gutter)] py-12 md:py-16 grid md:grid-cols-3 gap-10">
        <div>
          <Logo size="md" />
          <p className="mt-4 max-w-xs text-sm text-ink-soft leading-relaxed">
            Intelligent financial insights for Indian credit card users.
            Privacy-first, by design.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            { label: "Upload statement", href: "/dashboard?upload=1" },
            { label: "Tax Saver", href: "/tax" },
            { label: "Calculators", href: "/calculators" },
            { label: "Credit card guides", href: "/blog" },
            { label: "Sign in", href: "/login" },
            { label: "How it works", href: "/#how" },
          ]}
        />
        <FooterCol
          title="Trust"
          links={[
            { label: "Privacy promise", href: "/privacy" },
            { label: "Privacy Policy", href: "/privacy-policy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "Contact", href: "mailto:labhpay@gmail.com" },
          ]}
        />
      </div>

      <div className="border-t border-ink/8">
        <div className="mx-auto max-w-site px-[var(--site-gutter)] py-6 flex flex-wrap items-center justify-between gap-3 text-[12px] text-ink-muted">
          <p>© {new Date().getFullYear()} LabhPay. Made in India.</p>
          <p>
            INR only · Read-only intelligence · We never move money on your behalf.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
        {title}
      </p>
      <ul className="mt-4 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-ink hover:text-accent-ink transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
