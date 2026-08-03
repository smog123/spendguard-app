import React from "react";
import type { AccountRole } from "@spendguard/sdk";

const ROLE_STYLES: Record<AccountRole, string> = {
  Owner: "bg-purple-900/40 text-purple-300 border-purple-700/50",
  Admin: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  "Finance Manager": "bg-blue-900/40 text-blue-300 border-blue-700/50",
  Approver: "bg-amber-900/40 text-amber-300 border-amber-700/50",
  Viewer: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

export function RoleBadge({ role }: { role: AccountRole }) {
  const style = ROLE_STYLES[role] || "bg-zinc-800 text-zinc-300 border-zinc-700";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${style}`}
    >
      {role}
    </span>
  );
}
