export interface DevServerStatus {
  pid: number;
  port: number;
  startedAt: Date;
  lastHeartbeatAt: Date;
  idleSince: Date | null;
  requestCount: number;
}

export function getDevServerStatus(): DevServerStatus | null {
  return null;
}

export function isDevServerIdle(_status: DevServerStatus | null): boolean {
  return false;
}

export function autoRestartDevServerWhenIdle(_thresholdMinutes: number): Promise<void> {
  return Promise.resolve();
}

export function readPersistedDevServerStatus(): DevServerStatus | null {
  return null;
}

export function toDevServerHealthStatus(
  _status: DevServerStatus | null,
  _opts?: { autoRestartEnabled?: boolean; activeRunCount?: number },
): { status: "healthy" | "idle" | "stopped"; idleMinutes?: number } {
  return { status: "stopped" };
}