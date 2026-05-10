import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // NOTE: Do NOT use `output: 'standalone'` — Vercel uses its own builder.
  // NOTE: Do NOT use `ignoreBuildErrors: true` — it masks real TypeScript errors.
};

export default nextConfig;
