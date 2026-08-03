import type { Metadata } from "next";
import "./globals.css";
import { AccountProvider } from "@/context/AccountContext";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "SpendGuard — Policy-Aware Multi-Account Treasury Monitor",
  description:
    "Monitors Soroban x402 settlement events across multi-account treasuries, enforcing on-chain spending limit policies, budgets, and multi-sig approvals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-zinc-950">
      <body className="h-full font-sans text-zinc-100 antialiased">
        <AccountProvider>
          <div className="flex min-h-full flex-col">
            <Header />
            <main className="flex-1">
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </AccountProvider>
      </body>
    </html>
  );
}
