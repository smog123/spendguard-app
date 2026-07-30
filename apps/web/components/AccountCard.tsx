import Link from "next/link";
import type { MonitoredAccount } from "@spendguard/sdk";

interface AccountCardProps {
  account: MonitoredAccount;
}

export function AccountCard({ account }: AccountCardProps) {
  const truncatedAddress = `${account.address.slice(0, 8)}…${account.address.slice(-6)}`;

  return (
    <Link
      href={`/accounts/${encodeURIComponent(account.address)}`}
      className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-emerald-700/50 hover:bg-zinc-900 hover:shadow-lg hover:shadow-emerald-900/10"
    >
      {/* Status indicator */}
      <div className="absolute right-4 top-4 flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${
            account.enabled ? "bg-emerald-400" : "bg-zinc-600"
          }`}
        />
        <span className="text-xs text-zinc-600">
          {account.enabled ? "Active" : "Paused"}
        </span>
      </div>

      {/* Label or truncated address */}
      <h3 className="mb-1 text-base font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors">
        {account.label ?? truncatedAddress}
      </h3>

      {/* Full address (monospace) */}
      <p className="mb-3 font-mono text-xs text-zinc-600">
        {account.label ? truncatedAddress : null}
      </p>
      {!account.label && (
        <div className="mb-3" />
      )}

      {/* Context rule */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
          Rule #{account.contextRuleId}
        </span>
        <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
          {account.address}
        </span>
      </div>

      {/* Arrow indicator */}
      <div className="mt-4 flex items-center gap-1 text-xs text-zinc-600 transition-colors group-hover:text-emerald-400">
        View Details
        <svg
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
          />
        </svg>
      </div>
    </Link>
  );
}
