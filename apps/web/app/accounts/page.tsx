"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAccount } from "@/context/AccountContext";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";


export default function AccountListPage() {
  const { accounts, activeAccount, setActiveAccountId, loading } = useAccount();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(search.toLowerCase()) ||
      acc.description.toLowerCase().includes(search.toLowerCase()) ||
      acc.address.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || acc.status === statusFilter;
    const matchesType = typeFilter === "All" || acc.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const activeCount = accounts.filter((a) => a.status === "Active").length;
  const archivedCount = accounts.filter((a) => a.status === "Archived").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Treasury Accounts</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage unlimited multi-account treasuries, view spending limits, and switch context.
          </p>
        </div>
        <Link
          href="/accounts/new"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-all shadow-md hover:shadow-emerald-600/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Treasury Account
        </Link>
      </div>

      {/* KPI summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Accounts</p>
          <p className="mt-2 text-3xl font-extrabold text-white">{accounts.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Active Treasuries</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-400">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Archived Treasuries</p>
          <p className="mt-2 text-3xl font-extrabold text-zinc-400">{archivedCount}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search by name, description, or Stellar address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="All">All Types</option>
              <option value="Personal">Personal</option>
              <option value="Business">Business</option>
              <option value="DAO">DAO</option>
              <option value="NGO">NGO</option>
              <option value="Project">Project</option>
            </select>
          </div>
        </div>
      </div>

      {/* Account Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse h-48 rounded-2xl bg-zinc-900" />
          ))}
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center">
          <p className="text-sm text-zinc-400">No treasury accounts matched your filter criteria.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((account) => {
            const isActive = activeAccount?.id === account.id;

            return (
              <div
                key={account.id}
                className={`relative flex flex-col justify-between rounded-2xl border transition-all shadow-sm ${
                  isActive
                    ? "border-emerald-500/60 bg-gradient-to-b from-emerald-950/20 to-zinc-900/90 shadow-emerald-950/20"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                } p-6`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <AccountTypeBadge type={account.type} />
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          account.status === "Active"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            account.status === "Active" ? "bg-emerald-400" : "bg-zinc-500"
                          }`}
                        />
                        {account.status}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-lg font-bold text-white tracking-tight">{account.name}</h2>
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{account.description || "No description provided."}</p>

                  <div className="mt-4 rounded-lg bg-zinc-950/80 p-2.5 border border-zinc-800/60">
                    <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Stellar Address</span>
                    <span className="font-mono text-xs text-emerald-400 truncate block mt-0.5">
                      {account.address}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 font-medium">
                    <span>Created: {new Date(account.createdAt).toLocaleDateString()}</span>
                    <span>Rule #{account.contextRuleId}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAccountId(account.id)}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-emerald-500 text-zinc-950 font-bold"
                        : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    }`}
                  >
                    {isActive ? "Active Account" : "Switch Context"}
                  </button>

                  <Link
                    href={`/accounts/${account.id}`}
                    className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    Overview
                  </Link>

                  <Link
                    href={`/accounts/${account.id}/edit`}
                    className="rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    title="Edit Account"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
