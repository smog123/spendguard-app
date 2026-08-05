import type { Metadata } from "next";
import "./globals.css";
import { AccountProvider } from "@/context/AccountContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "SpendGuard — Policy-Aware Multi-Account Treasury Monitor",
  description:
    "Monitors Soroban x402 settlement events across multi-account treasuries, enforcing on-chain spending limit policies, budgets, and multi-sig approvals.",
};

// Inline script to prevent a flash of the wrong theme on page load.
// Applied to <html> before React hydrates; ThemeProvider keeps it in sync.
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('spendguard_theme');
      if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(theme);
    } catch(e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full font-sans text-zinc-100 antialiased">
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
