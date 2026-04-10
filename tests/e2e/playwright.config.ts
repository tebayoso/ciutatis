import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PAPERCLIP_E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DB_PORT =
  Number(process.env.PAPERCLIP_E2E_DB_PORT) ||
  (54_000 + Math.floor(Math.random() * 1_000));
const E2E_ROOT =
  process.env.PAPERCLIP_E2E_TMPDIR ??
  fs.mkdtempSync(path.join(os.tmpdir(), "ciutatis-e2e."));
const E2E_CONFIG = path.join(E2E_ROOT, "config.json");
const E2E_HOME = path.join(E2E_ROOT, "home");
const AUTHENTICATED = process.env.PAPERCLIP_E2E_AUTHENTICATED === "true";

process.env.PAPERCLIP_E2E_TMPDIR = E2E_ROOT;
process.env.PAPERCLIP_E2E_CONFIG = E2E_CONFIG;
process.env.PAPERCLIP_E2E_HOME = E2E_HOME;
process.env.PAPERCLIP_E2E_DB_PORT = String(DB_PORT);

fs.mkdirSync(E2E_HOME, { recursive: true });
fs.writeFileSync(
  E2E_CONFIG,
  JSON.stringify(
    {
      $meta: {
        version: 1,
        updatedAt: new Date().toISOString(),
        source: "doctor",
      },
      database: {
        mode: "embedded-postgres",
        embeddedPostgresDataDir: path.join(E2E_HOME, "instances", "e2e", "db"),
        embeddedPostgresPort: DB_PORT,
        backup: {
          enabled: true,
          intervalMinutes: 60,
          retentionDays: 30,
          dir: path.join(E2E_HOME, "instances", "e2e", "data", "backups"),
        },
      },
      logging: {
        mode: "file",
        logDir: path.join(E2E_HOME, "instances", "e2e", "logs"),
      },
      server: {
        deploymentMode: AUTHENTICATED ? "authenticated" : "local_trusted",
        exposure: "private",
        host: AUTHENTICATED ? "0.0.0.0" : "127.0.0.1",
        port: PORT,
        allowedHostnames: [],
        serveUi: true,
      },
      auth: {
        baseUrlMode: "auto",
        disableSignUp: false,
      },
      storage: {
        provider: "local_disk",
        localDisk: {
          baseDir: path.join(E2E_HOME, "instances", "e2e", "data", "storage"),
        },
        s3: {
          bucket: "paperclip",
          region: "us-east-1",
          prefix: "",
          forcePathStyle: false,
        },
      },
      secrets: {
        provider: "local_encrypted",
        strictMode: false,
        localEncrypted: {
          keyFilePath: path.join(E2E_HOME, "instances", "e2e", "secrets", "master.key"),
        },
      },
    },
    null,
    2,
  ),
);

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  // Start an isolated dev server with embedded Postgres. Authenticated runs use
  // Better Auth with a deterministic local secret so browser login/signup flows
  // can be exercised without repo-local config leaking into the harness.
  webServer: {
    command:
      'env -u DATABASE_URL ' +
      `PAPERCLIP_CONFIG="${E2E_CONFIG}" ` +
      `PAPERCLIP_HOME="${E2E_HOME}" ` +
      'PAPERCLIP_INSTANCE_ID=e2e ' +
      (AUTHENTICATED
        ? `BETTER_AUTH_SECRET="ciutatis-e2e-secret-0123456789abcdef" BETTER_AUTH_BASE_URL="${BASE_URL}" pnpm dev:once --authenticated-private`
        : 'pnpm dev:once'),
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !!process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  outputDir: "./test-results",
  reporter: [["list"], ["html", { open: "never", outputFolder: "./playwright-report" }]],
});
