import React from "react";
import type { AccountType } from "@spendguard/sdk";

const TYPE_STYLES: Record<AccountType, string> = {
  Personal: "bg-purple-950/60 text-purple-400 border-purple-800/50",
  Business: "bg-blue-950/60 text-blue-400 border-blue-800/50",
  DAO: "bg-emerald-950/60 text-emerald-400 border-emerald-800/50",
  NGO: "bg-amber-950/60 text-amber-400 border-amber-800/50",
  Project: "bg-indigo-950/60 text-indigo-400 border-indigo-800/50",
};

export function AccountTypeBadge({ type }: { type: AccountType }) {
  const style = TYPE_STYLES[type] || "bg-zinc-800 text-zinc-300 border-zinc-700";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {type}
    </span>
  );
}
