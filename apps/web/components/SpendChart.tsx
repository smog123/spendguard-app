"use client";

import { useEffect, useState } from "react";

interface SpendDataPoint {
  date: string;
  amount: string;
}

interface SpendChartProps {
  address: string;
}

export function SpendChart({ address }: SpendChartProps) {
  const [data, setData] = useState<SpendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : "http://localhost:3000";

        const res = await fetch(
          `${baseUrl}/api/accounts?address=${encodeURIComponent(address)}&alerts=true`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("Failed to fetch data");
        const alerts = await res.json();

        // Build a simple spend timeline from alert data
        const points: SpendDataPoint[] = (alerts as Array<{
          raisedAt: string;
          eventAmount: string;
        }>).map((a) => ({
          date: new Date(a.raisedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          amount: (BigInt(a.eventAmount) / BigInt(10_000_000)).toString(),
        }));

        setData(points);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [address]);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="h-48 animate-pulse rounded bg-zinc-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-sm text-red-400">Failed to load spend data: {error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="mb-4 text-sm font-medium text-zinc-400">
          Spend History
        </h3>
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-zinc-600">
            No spend events recorded yet for this account.
          </p>
        </div>
      </div>
    );
  }

  // Simple bar chart using divs
  const maxAmount = Math.max(
    ...data.map((d) => Number.parseFloat(d.amount)),
    1,
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">
        Spend History (XLM)
      </h3>
      <div className="flex h-48 items-end gap-2">
        {data.map((point, i) => {
          const height = (Number.parseFloat(point.amount) / maxAmount) * 100;
          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center"
            >
              <div
                className="w-full rounded-t bg-emerald-500/60 transition-all hover:bg-emerald-400/80"
                style={{ height: `${Math.max(height, 4)}%` }}
              >
                <div className="invisible absolute bottom-full mb-2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 shadow-lg group-hover:visible">
                  {point.amount} XLM — {point.date}
                </div>
              </div>
              <span className="mt-1 text-[10px] text-zinc-600">{point.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
