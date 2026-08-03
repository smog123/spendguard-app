"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { TreasuryAccount } from "@spendguard/sdk";

interface AccountContextType {
  accounts: TreasuryAccount[];
  activeAccount: TreasuryAccount | null;
  activeAccountId: string | null;
  setActiveAccountId: (id: string) => void;
  refreshAccounts: () => Promise<void>;
  loading: boolean;
  userRole: string;
  setUserRole: (role: string) => void;
}

const AccountContext = createContext<AccountContextType>({
  accounts: [],
  activeAccount: null,
  activeAccountId: null,
  setActiveAccountId: () => {},
  refreshAccounts: async () => {},
  loading: true,
  userRole: "Owner",
  setUserRole: () => {},
});

const STORAGE_KEY = "spendguard_active_account_id";

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("Owner");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = (await res.json()) as TreasuryAccount[];
        setAccounts(data);

        // Restore active account from localStorage or default to first
        const savedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (savedId && data.some((a) => a.id === savedId || a.address === savedId)) {
          const matched = data.find((a) => a.id === savedId || a.address === savedId);
          setActiveAccountIdState(matched ? matched.id : data[0]?.id || null);
        } else if (data.length > 0) {
          setActiveAccountIdState(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load treasury accounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const setActiveAccountId = (id: string) => {
    setActiveAccountIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const activeAccount = accounts.find((a) => a.id === activeAccountId || a.address === activeAccountId) || accounts[0] || null;

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccount,
        activeAccountId,
        setActiveAccountId,
        refreshAccounts: fetchAccounts,
        loading,
        userRole,
        setUserRole,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}
