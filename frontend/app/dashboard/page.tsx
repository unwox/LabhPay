"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryDonut } from "@/components/dashboard/CategoryDonut";
import { MonthlyTrend } from "@/components/dashboard/MonthlyTrend";
import {
  HeadlineTile,
  TopMerchants,
  HiddenChargesCard,
  SubscriptionsCard,
  EmiCard,
  UtilizationCard,
  StatementsList,
  EmptyState,
} from "@/components/dashboard/Tiles";
import { useAuth } from "@/lib/auth-context";
import { getDashboardSummary, type DashSummary, ApiError } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [summary, setSummary] = React.useState<DashSummary | null>(null);
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [loading, user, router]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setBusy(true);
      setError(null);
      try {
        const s = await getDashboardSummary();
        if (!cancelled) setSummary(s);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return;
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    if (user) load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !user) {
    return (
      <main className="min-h-screen grid place-items-center">
        <p className="text-ink-muted text-sm">Loading…</p>
      </main>
    );
  }

  const empty = summary && summary.txn_count === 0;
  const masked = user.phone_e164.replace(/(\+91)(\d{5})(\d{5})/, "$1 $2 $3");

  return (
    <main className="min-h-screen bg-ivory-fade">
      {/* Nav */}
      <header className="px-[var(--site-gutter)] py-5 md:py-7 flex items-center justify-between max-w-site mx-auto">
        <Link href="/" aria-label="LabhPay home">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/upload">
            <Button variant="primary" size="sm">
              Upload statement
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <section className="px-[var(--site-gutter)] py-8 md:py-12 max-w-site mx-auto space-y-6 md:space-y-8">
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            Signed in · {masked}
          </p>
          <h1 className="mt-3 font-display text-display-sm md:text-display-md text-ink">
            Your <em className="italic text-accent">spending</em>, at a glance.
          </h1>
        </div>

        {busy ? (
          <Card elevation="md" className="p-8 text-center">
            <p className="text-ink-muted">Loading your dashboard…</p>
          </Card>
        ) : error ? (
          <Card elevation="md" className="p-8">
            <p className="font-display text-xl text-ink">Couldn&rsquo;t load.</p>
            <p className="mt-2 text-ink-soft">{error}</p>
          </Card>
        ) : empty ? (
          <EmptyState />
        ) : summary ? (
          <>
            {/* Headline row */}
            <HeadlineTile
              total={summary.total_spending}
              txnCount={summary.txn_count}
              confidence={summary.confidence}
            />

            {/* Donut + trend */}
            <div className="grid lg:grid-cols-12 gap-4 md:gap-6">
              <Card elevation="md" className="p-6 md:p-7 lg:col-span-7">
                <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                  Where it went
                </p>
                <p className="mt-1 font-display text-xl text-ink">
                  Category breakdown
                </p>
                <div className="mt-5">
                  <CategoryDonut data={summary.by_category} />
                </div>
              </Card>

              <Card elevation="md" className="p-6 md:p-7 lg:col-span-5">
                <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                  Monthly trend
                </p>
                <p className="mt-1 font-display text-xl text-ink">
                  Spend over time
                </p>
                <div className="mt-5">
                  <MonthlyTrend data={summary.monthly_trend} />
                </div>
              </Card>
            </div>

            {/* Hidden charges + Subscriptions + Utilization + EMI */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <HiddenChargesCard data={summary.hidden_charges} />
              <SubscriptionsCard data={summary.recurring} />
              <UtilizationCard data={summary.utilization} />
              <EmiCard data={summary.emi} />
            </div>

            {/* Top merchants + statements */}
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <Card elevation="md" className="p-6 md:p-7">
                <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                  Top merchants
                </p>
                <p className="mt-1 font-display text-xl text-ink">
                  Where your card showed up most
                </p>
                <div className="mt-5">
                  <TopMerchants data={summary.top_merchants} />
                </div>
              </Card>

              <Card elevation="md" className="p-6 md:p-7">
                <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                  Statements
                </p>
                <p className="mt-1 font-display text-xl text-ink">
                  Loaded for this session
                </p>
                <div className="mt-5">
                  <StatementsList data={summary.statements} />
                </div>
              </Card>
            </div>

            <p className="text-xs text-ink-muted text-center pt-4">
              Statements are processed in memory and auto-deleted after your session ends.
            </p>
          </>
        ) : null}
      </section>
    </main>
  );
}
