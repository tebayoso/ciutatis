import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "paperclipai",
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "src/__tests__/worktree.test.ts"],
  },
});
