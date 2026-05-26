import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

export function Nav() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto max-w-site px-[var(--site-gutter)] h-16 md:h-20 flex items-center justify-between">
        <Link href="/" aria-label="LabhPay home">
          <Logo size="md" />
        </Link>
        <nav className="flex items-center gap-2 md:gap-4">
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
          <Link href="/upload">
            <Button variant="primary" size="sm">
              Upload statement
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
