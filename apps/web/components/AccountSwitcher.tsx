"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAccount } from "@/context/AccountContext";
import { AccountTypeBadge } from "./AccountTypeBadge";
import Link from "next/link";

export function AccountSwitcher() {
  const { accounts, activeAccount, setActiveAccountId } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              activeAccount?.status === "Active" ? "bg-emerald-400" : "bg-zinc-500"
            }`}
          />
          <span className="max-w-[160px] truncate font-semibold">
            {activeAccount ? activeAccount.name : "Select Treasury"}
          </span>
          {activeAccount && <AccountTypeBadge type={activeAccount.type} />}
        </div>
        <svg
          className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl backdrop-blur-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search treasury accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="my-1 border-t border-zinc-800" />

          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredAccounts.length === 0 ? (
              <p className="p-3 text-center text-xs text-zinc-500">No accounts found</p>
            ) : (
              filteredAccounts.map((acc) => {
                const isSelected = activeAccount?.id === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setActiveAccountId(acc.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "bg-emerald-950/40 border border-emerald-800/40 text-emerald-300"
                        : "hover:bg-zinc-800/60 text-zinc-300"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            acc.status === "Active" ? "bg-emerald-400" : "bg-zinc-600"
                          }`}
                        />
                        <span className="truncate text-xs font-semibold">{acc.name}</span>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
                        {acc.address.slice(0, 8)}...{acc.address.slice(-6)}
                      </p>
                    </div>
                    <AccountTypeBadge type={acc.type} />
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-1 border-t border-zinc-800 pt-1">
            <Link
              href="/accounts/new"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-emerald-600/20 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create New Treasury Account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
