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
  TopMerchants,
  HiddenChargesCard,
  SubscriptionsCard,
  EmiCard,
  UtilizationCard,
  StatementsList,
  EmptyState,
} from "@/components/dashboard/Tiles";
import {
  InsightsGrid,
  SuspiciousPanel,
  SpendingProfile,
  BeginnerToggle,
} from "@/components/dashboard/Insights";
import { Collapsible } from "@/components/dashboard/Collapsible";
import {
  FinancialSnapshot,
  PriorityActions,
  rankActions,
} from "@/components/dashboard/Overview";
import { UploadDialog } from "@/components/upload/UploadDialog";
import { ChatDrawer } from "@/components/assistant/ChatDrawer";
import { ExportCenter } from "@/components/exports/ExportCenter";
import { useAuth } from "@/lib/auth-context";
import { inr, titleCase } from "@/lib/format";
import {
  getDashboardSummary,
  getIntelligenceSummary,
  type DashSummary,
  type IntelligenceSummary,
  ApiError,
} from "@/lib/api";

const TOP_ACTIONS = 3;

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [summary, setSummary] = React.useState<DashSummary | null>(null);
  const [intel, setIntel] = React.useState<IntelligenceSummary | null>(null);
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [beginner, setBeginner] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  // Open the upload modal directly when arrived via ?upload=1 (e.g. a landing
  // CTA). Read from the URL on the client to avoid a Suspense boundary.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("upload") === "1") {
      setUploadOpen(true);
      // Clean the URL so a refresh doesn't re-open it.
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

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
        const [s, i] = await Promise.all([
          getDashboardSummary(),
          getIntelligenceSummary().catch(() => null),
        ]);
        if (!cancelled) {
          setSummary(s);
          setIntel(i);
        }
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
  const firstName =
    user.display_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  // Ranked actions (insights + suspicious), top few up front.
  const actions = intel ? rankActions(intel.insights, intel.suspicious) : [];
  const topActions = actions.slice(0, TOP_ACTIONS);
  const moreInsights = intel ? intel.insights : [];
  const suspicious = intel ? intel.suspicious : [];

  const topCat = summary?.by_category?.[0];
  const subsMonthly =
    summary?.recurring?.reduce((a, r) => a + r.monthly_amount, 0) ?? 0;

  return (
    <main className="min-h-screen bg-ivory-fade">
      {/* Nav */}
      <header className="px-[var(--site-gutter)] py-5 md:py-7 flex items-center justify-between max-w-site mx-auto">
        <Link href="/" aria-label="LabhPay home">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-2">
          {user?.is_admin ? (
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                Admin
              </Button>
            </Link>
          ) : null}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setUploadOpen(true)}
          >
            Upload statement
          </Button>
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

      <section className="px-[var(--site-gutter)] py-8 md:py-10 max-w-site mx-auto space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            Your money, at a glance
          </p>
          <h1 className="mt-3 font-display text-display-sm md:text-4xl text-ink">
            Hi {titleCase(firstName)}.{" "}
            <span className="text-ink-soft">Here&rsquo;s what matters.</span>
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
          <EmptyState onUpload={() => setUploadOpen(true)} />
        ) : summary ? (
          <>
            {/* 1 · Decision layer */}
            <FinancialSnapshot summary={summary} />

            {/* 2 · Needs your attention */}
            <div className="pt-2">
              <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                    Needs your attention
                  </p>
                  <h2 className="mt-1 font-display text-2xl text-ink">
                    {topActions.length
                      ? `Top ${topActions.length} ${
                          topActions.length === 1 ? "thing" : "things"
                        } to act on`
                      : "Nothing urgent"}
                  </h2>
                </div>
                {intel ? (
                  <BeginnerToggle value={beginner} onChange={setBeginner} />
                ) : null}
              </div>
              <PriorityActions cards={topActions} beginner={beginner} />
            </div>

            {/* 3 · Progressive disclosure — explore on demand */}
            <div className="space-y-3 pt-2">
              <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                Explore further
              </p>

              <Collapsible
                eyebrow="Where it went"
                title="Spending breakdown"
                summary={
                  topCat
                    ? `${titleCase(topCat.category)} leads · ${inr(topCat.amount)}`
                    : undefined
                }
              >
                <div className="grid lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7">
                    <CategoryDonut data={summary.by_category} />
                  </div>
                  <div className="lg:col-span-5">
                    <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted mb-3">
                      Spend over time
                    </p>
                    <MonthlyTrend data={summary.monthly_trend} />
                  </div>
                  <div className="lg:col-span-12">
                    <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted mb-2">
                      Top merchants
                    </p>
                    <TopMerchants data={summary.top_merchants} />
                  </div>
                </div>
              </Collapsible>

              <Collapsible
                eyebrow="Charges & limits"
                title="Fees, interest & utilization"
                summary={
                  summary.hidden_charges.has_any
                    ? `${inr(summary.hidden_charges.total)} in charges`
                    : "No charges this cycle"
                }
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <HiddenChargesCard data={summary.hidden_charges} />
                  <UtilizationCard data={summary.utilization} />
                </div>
              </Collapsible>

              <Collapsible
                eyebrow="Recurring"
                title="Subscriptions & EMIs"
                summary={
                  summary.recurring.length || summary.emi.count
                    ? `${summary.recurring.length} recurring${
                        subsMonthly ? ` · ${inr(subsMonthly)}/mo` : ""
                      }`
                    : "None detected"
                }
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <SubscriptionsCard data={summary.recurring} />
                  <EmiCard data={summary.emi} />
                </div>
              </Collapsible>

              {intel && (moreInsights.length || suspicious.length) ? (
                <Collapsible
                  eyebrow="Spending intelligence"
                  title="All insights & alerts"
                  badge={
                    <span className="text-[11px] uppercase tracking-eyebrow bg-accent-mist text-accent-ink px-2.5 py-1 rounded-full">
                      {moreInsights.length + suspicious.length}
                    </span>
                  }
                >
                  <div className="space-y-5">
                    <InsightsGrid data={moreInsights} beginner={beginner} />
                    {suspicious.length ? (
                      <SuspiciousPanel data={suspicious} beginner={beginner} />
                    ) : null}
                  </div>
                </Collapsible>
              ) : null}

              {intel && intel.profile_tags.length ? (
                <Collapsible
                  eyebrow="About you"
                  title="Your spending profile"
                  summary={`You look like a ${intel.profile_tags[0].title}`}
                >
                  <SpendingProfile data={intel.profile_tags} />
                </Collapsible>
              ) : null}

              <Collapsible
                eyebrow="Records"
                title="Statements & reports"
                summary={`${summary.statements.length} loaded`}
              >
                <div className="space-y-5">
                  <StatementsList data={summary.statements} />
                  <ExportCenter />
                </div>
              </Collapsible>
            </div>

            <p className="text-xs text-ink-muted text-center pt-4">
              Statements are processed in memory and auto-deleted after your
              session ends.
            </p>
          </>
        ) : null}
      </section>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ChatDrawer />
    </main>
  );
}
