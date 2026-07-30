import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SpendChart } from "@/components/SpendChart";
import { AlertList } from "@/components/AlertList";
import type { SpendAlert, MonitoredAccount } from "@spendguard/sdk";

// ── Data fetching ─────────────────────────────────────────────────────

async function fetchAccount(address: string): Promise<MonitoredAccount | null> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/accounts`, {
    cache: "no-store",
  });

  if (!res.ok) return null;

  const accounts = (await res.json()) as MonitoredAccount[];
  return accounts.find((a) => a.address === address) ?? null;
}

async function fetchAlerts(address: string): Promise<SpendAlert[]> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/accounts?address=${address}&alerts=true`, {
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json() as Promise<SpendAlert[]>;
}

// ── Page content ──────────────────────────────────────────────────────

async function AccountContent({ address }: { address: string }) {
  const [account, alerts] = await Promise.all([
    fetchAccount(address),
    fetchAlerts(address),
  ]);

  if (!account) {
    notFound();
  }

  const breachCount = alerts.filter((a) => a.level === "breach").length;
  const nearMissCount = alerts.filter((a) => a.level === "near_miss").length;

  return (
    <div>
      {/* Account header */}
      <div className="mb-8">
        <a
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Dashboard
        </a>
        <h1 className="text-2xl font-bold tracking-tight">
          {account.label ?? "Account"}
        </h1>
        <p className="mt-1 font-mono text-sm text-zinc-500">{account.address}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Rule #{account.contextRuleId}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                account.enabled ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            {account.enabled ? "Monitoring" : "Paused"}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Total Alerts
          </p>
          <p className="mt-1 text-3xl font-bold">{alerts.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-red-400">
            Breaches
          </p>
          <p className="mt-1 text-3xl font-bold text-red-400">{breachCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400">
            Near Misses
          </p>
          <p className="mt-1 text-3xl font-bold text-amber-400">
            {nearMissCount}
          </p>
        </div>
      </div>

      {/* Spend chart */}
      <div className="mb-8">
        <SpendChart address={address} contextRuleId={account.contextRuleId} />
      </div>

      {/* Alert history */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Alert History</h2>
        <AlertList alerts={alerts} />
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────

function AccountSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 h-6 w-48 rounded bg-zinc-800" />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-zinc-900" />
        ))}
      </div>
      <div className="mb-8 h-72 rounded-xl bg-zinc-900" />
      <div className="h-48 rounded-xl bg-zinc-900" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default async function AccountPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AccountContent address={address} />
    </Suspense>
  );
}
