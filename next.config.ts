import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables Next.js 16 Cache Components: the `'use cache'` directive,
  // `cacheTag()`, `cacheLife()`, and the Partial Prerendering machinery.
  // The project's unstable_cache readers are migrated to `use cache` in
  // a follow-up SDD change.
  cacheComponents: true,
};

export default nextConfig;
