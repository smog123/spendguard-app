"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "@/context/AccountContext";
import { isValidStellarAddress, AccountType } from "@spendguard/sdk";

export default function CreateAccountPage() {
  const router = useRouter();
  const { refreshAccounts, setActiveAccountId } = useAccount();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<AccountType>("Business");
  const [ownerEmail, setOwnerEmail] = useState("owner@spendguard.io");
  const [ownerName, setOwnerName] = useState("Alice Owner");
  const [initialCap, setInitialCap] = useState("10000");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Account name is required");
      return;
    }

    if (!isValidStellarAddress(address.trim())) {
      setError("Invalid Stellar wallet address (must start with G and be exactly 56 characters long)");
      return;
    }

    if (!ownerEmail.includes("@")) {
      setError("Valid owner email address is required");
      return;
    }

    try {
      setSubmitting(true);
      const capInStroops = (BigInt(initialCap || "10000") * 10_000_000n).toString();

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          address: address.trim(),
          type,
          ownerEmail: ownerEmail.trim(),
          ownerName: ownerName.trim(),
          initialCap: capInStroops,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        await refreshAccounts();
        setActiveAccountId(created.id);
        router.push(`/accounts/${created.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create treasury account");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/accounts"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Treasury Accounts List
      </Link>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl backdrop-blur-md">
        <h1 className="text-2xl font-bold tracking-tight text-white">Create New Treasury Account</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Establish an isolated treasury vault for policy monitoring, budget tracking, multi-sig, and members.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-xs font-medium text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
              Account Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Marketing & Ecosystem Treasury"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Purpose and governance details for this account..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
              Stellar Wallet Address (G...) <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-mono text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Must be a 56-character public key starting with G (e.g. OpenZeppelin smart account address).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Account Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="Personal">Personal</option>
                <option value="Business">Business</option>
                <option value="DAO">DAO</option>
                <option value="NGO">NGO</option>
                <option value="Project">Project</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Initial Spending Cap (XLM / USDC)
              </label>
              <input
                type="number"
                min="1"
                value={initialCap}
                onChange={(e) => setInitialCap(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Initial Owner Assignment
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Owner Email</label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Link
              href="/accounts"
              className="rounded-xl border border-zinc-800 px-5 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md"
            >
              {submitting ? "Creating Treasury Account..." : "Create Treasury Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
