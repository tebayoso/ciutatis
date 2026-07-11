import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, "../..");

export default defineConfig({
  root: path.join(appRoot, "admin-shell"),
  publicDir: path.join(appRoot, "public"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.join(appRoot, "src/admin"),
    },
  },
  css: {
    postcss: path.join(appRoot, "postcss.config.mjs"),
  },
  build: {
    outDir: path.join(repoRoot, "server/ui-dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
});
