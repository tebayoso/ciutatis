import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The admin SPA (moved from the former Vite app) was bundled by Vite without
  // type-checking the files its tsconfig excluded, and without lint gating.
  // Preserve that behavior so `next build` bundles it; type/lint debt is tracked
  // separately as routes migrate to native SSR.
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      { source: "/", has: [{ type: "host", value: "admin.ciutatis.com" }], destination: "/admin", permanent: false },
      { source: "/:path((?!admin|api|_next)[^.]*)", has: [{ type: "host", value: "admin.ciutatis.com" }], destination: "/admin/:path", permanent: false },
    ];
  },
  // The admin SPA consumes workspace packages from source (exports -> src),
  // which use NodeNext ".js" import specifiers that actually resolve to ".ts".
  // esbuild/Vite rewrote these automatically; webpack needs extensionAlias.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".jsx": [".tsx", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;

// Cloudflare Workers (OpenNext) dev integration. Enables `getCloudflareContext()`
// and worker bindings during `next dev`. No-op outside the Cloudflare dev flow.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
void initOpenNextCloudflareForDev();
