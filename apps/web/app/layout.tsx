import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpendGuard — Spending Limit Monitor",
  description:
    "Monitors Soroban x402 settlement events against on-chain spending limit policies and raises breach and near-miss alerts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-zinc-950">
      <body className="h-full font-sans text-zinc-100 antialiased">
        <div className="flex min-h-full flex-col">
          <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <a href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                  <svg
                    className="h-5 w-5 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                  </svg>
                </div>
                <span className="text-lg font-semibold tracking-tight">
                  SpendGuard
                </span>
              </a>
              <nav className="flex items-center gap-4 text-sm text-zinc-400">
                <a href="/" className="transition-colors hover:text-zinc-100">
                  Dashboard
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
