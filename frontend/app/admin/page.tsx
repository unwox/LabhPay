"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import {
  adminListUsers,
  adminAnalytics,
  adminHealth,
  adminUserAction,
  ApiError,
  type AdminUsersResp,
  type AdminAnalytics,
  type AdminHealth,
} from "@/lib/api";

type Tab = "users" | "analytics" | "health";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = React.useState<Tab>("users");

  // Gate: must be logged in AND admin.
  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (!user.is_admin) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="min-h-screen grid place-items-center bg-ivory-fade">
        <p className="text-ink-muted text-sm">Loading…</p>
      </main>
    );
  }
  if (!user.is_admin) {
    return (
      <main className="min-h-screen grid place-items-center bg-ivory-fade">
        <p className="text-ink-muted text-sm">Redirecting…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory-fade">
      <header className="px-[var(--site-gutter)] py-5 md:py-7 flex items-center justify-between max-w-site mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="LabhPay home">
            <Logo size="md" />
          </Link>
          <span className="text-[11px] uppercase tracking-eyebrow text-ink-muted border border-ink/12 rounded-full px-2 py-0.5">
            Admin
          </span>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            Back to dashboard
          </Button>
        </Link>
      </header>

      <section className="px-[var(--site-gutter)] py-6 md:py-10 max-w-site mx-auto space-y-6">
        <div>
          <h1 className="font-display text-display-sm md:text-4xl text-ink">
            Control room.
          </h1>
          <p className="mt-2 text-ink-soft">
            Signed in as {user.email} · admin
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-ink/10">
          {(["users", "analytics", "health"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize -mb-px border-b-2 transition-colors ${
                tab === t
                  ? "border-accent text-ink font-medium"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "users" ? <UsersTab /> : null}
        {tab === "analytics" ? <AnalyticsTab /> : null}
        {tab === "health" ? <HealthTab /> : null}
      </section>
    </main>
  );
}

// ---------------- Users ----------------

function UsersTab() {
  const [data, setData] = React.useState<AdminUsersResp | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      setData(await adminListUsers());
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't load users.");
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function act(
    id: string,
    action: "disable" | "enable" | "logout" | "reset-limits"
  ) {
    setBusyId(id);
    try {
      await adminUserAction(id, action);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return (
      <Card elevation="md" className="p-6">
        <p className="text-ink-soft">{error}</p>
      </Card>
    );
  }
  if (!data) {
    return <p className="text-ink-muted text-sm">Loading users…</p>;
  }

  const t = data.totals;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total users" value={t.users} />
        <Stat label="New · 7d" value={t.new_7d} />
        <Stat label="Active · 7d" value={t.active_7d} />
        <Stat label="Active · 30d" value={t.active_30d} />
        <Stat label="Disabled" value={t.disabled} />
      </div>

      <Card elevation="md" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-warm text-ink-muted text-left text-[11px] uppercase tracking-eyebrow">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3 font-medium text-right">Logins</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="border-t border-ink/8">
                  <td className="px-4 py-3">
                    <div className="text-ink">
                      {u.email || u.phone_e164 || u.display_name || u.id.slice(0, 8)}
                      {u.is_admin ? (
                        <span className="ml-2 text-[10px] uppercase tracking-eyebrow text-accent">
                          admin
                        </span>
                      ) : null}
                    </div>
                    {u.email && u.phone_e164 ? (
                      <div className="text-ink-muted text-xs">{u.phone_e164}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-ink-soft capitalize">{u.auth_method}</td>
                  <td className="px-4 py-3 text-ink-soft">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-ink-soft">{fmtDate(u.last_login_at)}</td>
                  <td className="px-4 py-3 text-ink-soft text-right">{u.login_count}</td>
                  <td className="px-4 py-3">
                    {u.disabled ? (
                      <span className="text-xs rounded-full bg-red-100 text-red-700 px-2 py-0.5">
                        disabled
                      </span>
                    ) : (
                      <span className="text-xs rounded-full bg-accent-mist text-accent-ink px-2 py-0.5">
                        active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end flex-wrap">
                      {u.disabled ? (
                        <MiniBtn
                          onClick={() => act(u.id, "enable")}
                          busy={busyId === u.id}
                        >
                          Enable
                        </MiniBtn>
                      ) : (
                        <MiniBtn
                          onClick={() => act(u.id, "disable")}
                          busy={busyId === u.id}
                          disabled={u.is_admin}
                          danger
                        >
                          Disable
                        </MiniBtn>
                      )}
                      <MiniBtn
                        onClick={() => act(u.id, "logout")}
                        busy={busyId === u.id}
                      >
                        Force logout
                      </MiniBtn>
                      <MiniBtn
                        onClick={() => act(u.id, "reset-limits")}
                        busy={busyId === u.id}
                      >
                        Reset limits
                      </MiniBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MiniBtn({
  children,
  onClick,
  busy,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`text-xs rounded-lg px-2.5 py-1 border transition-colors disabled:opacity-40 ${
        danger
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : "border-ink/12 text-ink-soft hover:bg-accent-mist"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------- Analytics ----------------

function AnalyticsTab() {
  const [data, setData] = React.useState<AdminAnalytics | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [days, setDays] = React.useState(30);

  React.useEffect(() => {
    setError(null);
    setData(null);
    adminAnalytics(days)
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.detail : "Couldn't load analytics.")
      );
  }, [days]);

  if (error) {
    return (
      <Card elevation="md" className="p-6">
        <p className="text-ink-soft">{error}</p>
      </Card>
    );
  }
  if (!data) return <p className="text-ink-muted text-sm">Loading analytics…</p>;

  if (!data.available) {
    return (
      <Card elevation="md" tone="mist" className="p-6">
        <p className="font-display text-lg text-ink">Analytics not ready yet</p>
        <p className="mt-2 text-ink-soft text-sm">
          {data.reason || "No events recorded yet."} Events start accumulating
          once users log in, upload, and use the assistant.
        </p>
      </Card>
    );
  }

  const tot = data.totals;
  const maxDau = Math.max(1, ...data.daily_active.map((d) => d.users));

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`text-xs rounded-full px-3 py-1 border ${
              days === d
                ? "border-accent bg-accent-mist text-accent-ink"
                : "border-ink/12 text-ink-muted hover:text-ink"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {tot ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Events" value={tot.events} />
          <Stat label="Logins" value={tot.logins} />
          <Stat label="Uploads" value={tot.uploads} />
          <Stat label="Assistant" value={tot.assistant_turns} />
          <Stat label="Exports" value={tot.exports} />
          <Stat label="Resolutions" value={tot.resolution_emails} />
        </div>
      ) : null}

      <Card elevation="md" className="p-6">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
          Daily active users
        </p>
        {data.daily_active.length === 0 ? (
          <p className="mt-3 text-ink-muted text-sm">No activity in this window.</p>
        ) : (
          <div className="mt-4 flex items-end gap-1 h-32">
            {data.daily_active.map((d) => (
              <div
                key={d.day}
                className="flex-1 bg-accent/70 rounded-t hover:bg-accent transition-colors"
                style={{ height: `${(d.users / maxDau) * 100}%` }}
                title={`${d.day}: ${d.users} active`}
              />
            ))}
          </div>
        )}
      </Card>

      <Card elevation="md" className="p-6">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted mb-3">
          All events
        </p>
        <div className="space-y-1.5">
          {Object.entries(data.events)
            .sort((a, b) => b[1] - a[1])
            .map(([ev, n]) => (
              <div key={ev} className="flex justify-between text-sm">
                <span className="text-ink-soft font-mono text-xs">{ev}</span>
                <span className="text-ink">{n}</span>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

// ---------------- Health ----------------

function HealthTab() {
  const [data, setData] = React.useState<AdminHealth | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setError(null);
    adminHealth()
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.detail : "Couldn't load health.")
      );
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <Card elevation="md" className="p-6">
        <p className="text-ink-soft">{error}</p>
      </Card>
    );
  }
  if (!data) return <p className="text-ink-muted text-sm">Loading health…</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load}>
          Refresh
        </Button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card elevation="md" className="p-6">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">Redis</p>
          <p className="mt-2 font-display text-2xl text-ink">
            {data.redis.ok ? "Healthy" : "Down"}
          </p>
          {typeof data.redis.dbsize === "number" ? (
            <p className="mt-1 text-ink-soft text-sm">{data.redis.dbsize} keys</p>
          ) : null}
          {data.redis.error ? (
            <p className="mt-1 text-red-600 text-xs">{data.redis.error}</p>
          ) : null}
        </Card>

        <Card elevation="md" className="p-6">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            User store
          </p>
          <p className="mt-2 font-display text-2xl text-ink capitalize">
            {data.users.store || "—"}
          </p>
          {typeof data.users.count === "number" ? (
            <p className="mt-1 text-ink-soft text-sm">{data.users.count} users</p>
          ) : null}
        </Card>

        <Card elevation="md" className="p-6">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
            AI gateway
          </p>
          <p className="mt-2 font-display text-2xl text-ink">
            {data.ai.error ? "Error" : "Online"}
          </p>
          <p className="mt-1 text-ink-soft text-xs">
            fast: {data.ai.fast_priority || "—"}
          </p>
          <p className="text-ink-soft text-xs">
            deep: {data.ai.deep_priority || "—"}
          </p>
        </Card>
      </div>

      {data.ai.providers ? (
        <Card elevation="md" className="p-6">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted mb-3">
            AI providers
          </p>
          <pre className="text-xs text-ink-soft overflow-x-auto">
            {JSON.stringify(data.ai.providers, null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}

// ---------------- shared ----------------

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card elevation="sm" className="p-4">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
    </Card>
  );
}
