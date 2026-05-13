import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    name: "@paperclipai/ui",
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
