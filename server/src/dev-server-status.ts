import { readFileSync } from "node:fs";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface DevServerStatus {
  dirty: boolean;
  lastChangedAt: string | null;
  changedPathCount: number;
  changedPathsSample: string[];
  pendingMigrations: string[];
  lastRestartAt: string | null;
}

export interface DevServerHealthStatus {
  enabled: true;
  restartRequired: boolean;
  reason: "backend_changes" | "pending_migrations" | null;
  lastChangedAt: string | null;
  changedPathCount: number;
  changedPathsSample: string[];
  pendingMigrations: string[];
  autoRestartEnabled: boolean;
  activeRunCount: number;
  waitingForIdle: boolean;
  lastRestartAt: string | null;
};

export type DevServerRestartRequest = {
  requestedAt: string;
  reason: "manual_restart_now";
};

export function getDevServerRestartRequestFilePath(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const statusFilePath = env.PAPERCLIP_DEV_SERVER_STATUS_FILE?.trim();
  if (!statusFilePath) return null;
  return path.join(path.dirname(statusFilePath), "dev-server-restart-request.json");
}

export function writeDevServerRestartRequest(
  request: DevServerRestartRequest,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const filePath = getDevServerRestartRequestFilePath(env);
  if (!filePath) return false;

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(request, null, 2)}\n`, "utf8");
  return true;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function getDevServerStatus(): DevServerStatus | null {
  return readPersistedDevServerStatus();
}

export function isDevServerIdle(_status: DevServerStatus | null): boolean {
  return false;
}

export function autoRestartDevServerWhenIdle(_thresholdMinutes: number): Promise<void> {
  return Promise.resolve();
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export function readPersistedDevServerStatus(): DevServerStatus | null {
  const filePath = process.env.PAPERCLIP_DEV_SERVER_STATUS_FILE?.trim();
  if (!filePath) return null;
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
    return {
      dirty: Boolean(parsed.dirty),
      lastChangedAt: typeof parsed.lastChangedAt === "string" ? parsed.lastChangedAt : null,
      changedPathCount: Number.isFinite(Number(parsed.changedPathCount)) ? Number(parsed.changedPathCount) : 0,
      changedPathsSample: asStringArray(parsed.changedPathsSample),
      pendingMigrations: asStringArray(parsed.pendingMigrations),
      lastRestartAt: typeof parsed.lastRestartAt === "string" ? parsed.lastRestartAt : null,
    };
  } catch {
    return null;
  }
}

export function toDevServerHealthStatus(
  status: DevServerStatus,
  opts: { autoRestartEnabled?: boolean; activeRunCount?: number } = {},
): DevServerHealthStatus {
  const activeRunCount = Math.max(0, Math.trunc(opts.activeRunCount ?? 0));
  const pendingMigrations = status.pendingMigrations;
  const restartRequired = Boolean(status.dirty || pendingMigrations.length > 0);
  const reason = pendingMigrations.length > 0
    ? "pending_migrations"
    : status.dirty
      ? "backend_changes"
      : null;

  return {
    enabled: true,
    restartRequired,
    reason,
    lastChangedAt: status.lastChangedAt,
    changedPathCount: status.changedPathCount,
    changedPathsSample: status.changedPathsSample,
    pendingMigrations,
    autoRestartEnabled: Boolean(opts.autoRestartEnabled),
    activeRunCount,
    waitingForIdle: restartRequired && Boolean(opts.autoRestartEnabled) && activeRunCount > 0,
    lastRestartAt: status.lastRestartAt,
  };
}
