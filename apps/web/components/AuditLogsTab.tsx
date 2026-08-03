"use client";

import React, { useEffect, useState, useCallback } from "react";

interface AuditLogItem {
  id: string;
  action: string;
  actorEmail: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
}

export function AuditLogsTab({ accountId }: { accountId: string }) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/accounts/${accountId}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white">Security & Operations Audit Trail</h2>
        <p className="text-xs text-zinc-400">
          Immutable log of configuration edits, member alterations, policies, and disbursements for this account.
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-12 rounded-lg bg-zinc-900" />
          <div className="h-12 rounded-lg bg-zinc-900" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
          <p className="text-sm text-zinc-400">No audit logs recorded for this treasury account yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900 text-zinc-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-zinc-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-400 font-mono">{log.action}</td>
                  <td className="px-4 py-3 font-medium text-white">{log.actorEmail}</td>
                  <td className="px-4 py-3 text-zinc-300">{log.details}</td>
                  <td className="px-4 py-3 font-mono text-zinc-500">{log.ipAddress || "127.0.0.1"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
