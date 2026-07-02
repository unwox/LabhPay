"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

/**
 * Sticky nav: transparent over the hero, frosted glass with a hairline once
 * the user scrolls. Fixed so the brand and CTA are always one glance away.
 */
export function Nav() {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-paper/80 backdrop-blur-md border-b border-ink/8 shadow-[0_1px_0_rgba(20,20,30,0.03)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-site px-[var(--site-gutter)] h-16 md:h-[4.5rem] flex items-center justify-between">
        <Link href="/" aria-label="LabhPay home" className="transition-transform duration-300 hover:scale-[1.02]">
          <Logo size="md" />
        </Link>
        <nav className="flex items-center gap-2 md:gap-4">
          <Link
            href="/tax"
            className="hidden md:inline text-sm text-ink-soft hover:text-ink transition-colors"
          >
            Tax
          </Link>
          <Link
            href="/calculators"
            className="hidden md:inline text-sm text-ink-soft hover:text-ink transition-colors"
          >
            Calculators
          </Link>
          <Link
            href="/blog"
            className="hidden md:inline text-sm text-ink-soft hover:text-ink transition-colors"
          >
            Guides
          </Link>
          <Link
            href="/privacy"
            className="hidden md:inline text-sm text-ink-soft hover:text-ink transition-colors"
          >
            Privacy
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="hidden md:inline-flex">
              Sign in
            </Button>
          </Link>
          <Link href="/dashboard?upload=1">
            <Button variant="primary" size="sm">
              Upload statement
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
