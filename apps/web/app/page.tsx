import { Suspense } from "react";
import { AccountCard } from "@/components/AccountCard";
import type { MonitoredAccount } from "@spendguard/sdk";

// ── Data fetching ─────────────────────────────────────────────────────

async function fetchAccounts(): Promise<MonitoredAccount[]> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/accounts`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch accounts: ${res.statusText}`);
  }

  return res.json() as Promise<MonitoredAccount[]>;
}

// ── Loading state ─────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <div className="mb-3 h-5 w-3/4 rounded bg-zinc-800" />
          <div className="mb-2 h-4 w-1/2 rounded bg-zinc-800" />
          <div className="h-4 w-2/3 rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-6 py-16 text-center">
      <div className="mb-4 rounded-full bg-zinc-800 p-4">
        <svg
          className="h-8 w-8 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="mb-1 text-lg font-semibold text-zinc-300">
        No monitored accounts
      </h2>
      <p className="mb-6 max-w-sm text-sm text-zinc-500">
        Add an account to start monitoring spending limits and receiving
        breach/near-miss alerts.
      </p>
      {/* Add account button — wire to a modal or form in a follow-up */}
      <button
        type="button"
        disabled
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white opacity-50"
      >
        Add Account (coming soon)
      </button>
    </div>
  );
}

// ── Dashboard content ─────────────────────────────────────────────────

async function DashboardContent() {
  let accounts: MonitoredAccount[];
  try {
    accounts = await fetchAccounts();
  } catch {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 px-6 py-8 text-center">
        <p className="text-sm text-red-400">
          Unable to load monitored accounts. Check that the API server is
          running and DATABASE_URL is configured.
        </p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard key={account.address} account={account} />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Monitored Soroban smart accounts and their spending limit status.
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
