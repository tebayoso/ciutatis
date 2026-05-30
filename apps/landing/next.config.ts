import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;

// Cloudflare Workers (OpenNext) dev integration. Enables `getCloudflareContext()`
// and worker bindings during `next dev`. No-op outside the Cloudflare dev flow.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
void initOpenNextCloudflareForDev();
