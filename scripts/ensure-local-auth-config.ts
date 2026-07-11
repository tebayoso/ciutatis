import fs from "node:fs";
import path from "node:path";
import { ensureAgentJwtSecret } from "../cli/src/config/env.js";
import { ensureLocalSecretsKeyFile } from "../cli/src/config/secrets-key.js";
import { writeConfig, resolveConfigPath } from "../cli/src/config/store.js";
import type { CiutatisConfig } from "../cli/src/config/schema.js";
import {
  resolveDefaultBackupDir,
  resolveDefaultEmbeddedPostgresDir,
  resolveDefaultLogsDir,
  resolveCiutatisInstanceId,
} from "../cli/src/config/home.js";
import { defaultSecretsConfig } from "../cli/src/prompts/secrets.js";
import { defaultStorageConfig } from "../cli/src/prompts/storage.js";

const instanceId = resolveCiutatisInstanceId();

const config: CiutatisConfig = {
  $meta: {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: "configure",
  },
  database: {
    mode: "embedded-postgres",
    embeddedPostgresDataDir: resolveDefaultEmbeddedPostgresDir(instanceId),
    embeddedPostgresPort: 54329,
    backup: {
      enabled: true,
      intervalMinutes: 60,
      retentionDays: 30,
      dir: resolveDefaultBackupDir(instanceId),
    },
  },
  logging: {
    mode: "file",
    logDir: resolveDefaultLogsDir(instanceId),
  },
  server: {
    deploymentMode: "authenticated",
    exposure: "private",
    host: "127.0.0.1",
    port: 3100,
    allowedHostnames: [],
    serveUi: true,
  },
  auth: {
    baseUrlMode: "auto",
    disableSignUp: false,
  },
  storage: defaultStorageConfig(),
  secrets: defaultSecretsConfig(),
};

const configPath = resolveConfigPath();
writeConfig(config, configPath);
ensureLocalSecretsKeyFile(config, configPath);
ensureAgentJwtSecret(configPath);

const envPath = path.resolve(path.dirname(configPath), ".env");
const envEntries = new Map<string, string>();
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    envEntries.set(key, rest.join("="));
  }
}

envEntries.set("BETTER_AUTH_SECRET", process.env.BETTER_AUTH_SECRET ?? "paperclip-dev-secret");
envEntries.set("PAPERCLIP_DEPLOYMENT_MODE", "authenticated");
envEntries.set("PAPERCLIP_DEPLOYMENT_EXPOSURE", "private");

const envLines = [
  "# Ciutatis local development environment",
  ...Array.from(envEntries.entries()).map(([key, value]) => `${key}=${value}`),
  "",
];
fs.mkdirSync(path.dirname(envPath), { recursive: true });
fs.writeFileSync(envPath, envLines.join("\n"), "utf8");

console.log(`Wrote authenticated local config to ${configPath}`);
