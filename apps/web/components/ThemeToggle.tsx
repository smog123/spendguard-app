"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";

/**
 * Animated sun/moon switch for toggling between light and dark themes.
 *
 * Renders a same-size placeholder until the client mounts and the
 * ThemeProvider syncs the real theme — avoiding both a flash of the wrong
 * state and React hydration mismatches (the persisted/system theme can
 * differ from the SSR default).
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span
        className={`inline-block h-9 w-[72px] shrink-0 rounded-full ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className={`group relative h-9 w-[72px] shrink-0 rounded-full border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950 ${
        isDark
          ? "border-zinc-700 bg-zinc-800/80 hover:border-zinc-600"
          : "border-zinc-300 bg-zinc-100 hover:border-zinc-400"
      } ${className}`}
    >
      {/* Sun */}
      <svg
        className={`absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300 ${
          isDark ? "text-zinc-500" : "text-amber-500"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </svg>

      {/* Moon */}
      <svg
        className={`absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300 ${
          isDark ? "text-indigo-300" : "text-zinc-400"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
        />
      </svg>

      {/* Sliding thumb */}
      <span
        className={`absolute left-[3px] top-[3px] h-[30px] w-[34px] rounded-full shadow-md transition-transform duration-300 ease-out ${
          isDark
            ? "translate-x-8 border border-zinc-600 bg-gradient-to-br from-zinc-600 to-zinc-800"
            : "translate-x-0 border border-amber-300 bg-gradient-to-br from-amber-300 to-amber-500"
        }`}
      >
        <span
          className={`absolute inset-0 rounded-full transition-opacity duration-300 ${
            isDark
              ? "opacity-100 shadow-[0_0_10px_rgb(99_102_241/0.35)]"
              : "opacity-100 shadow-[0_0_10px_rgb(245_158_11/0.4)]"
          }`}
        />
      </span>
    </button>
  );
}
