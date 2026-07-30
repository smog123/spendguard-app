import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Turbopack is used in dev by default with Next.js 15
  experimental: {
    // Enable if you need it
  },
};

export default nextConfig;
