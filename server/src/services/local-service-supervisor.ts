export interface ProcessGroupStatus {
  alive: boolean;
  pid?: number;
  lastHeartbeatAt?: Date;
}

export interface LocalServiceRegistryRecord {
  serviceKey: string;
  runtimeServiceId: string;
  port: number;
  pid: number;
  createdAt: string;
  lastTouchedAt: string;
  processGroupId?: string | null;
  reuseKey?: string;
  url?: string;
  startedAt?: string;
  command?: string | null;
  cwd?: string;
  envFingerprint?: string;
  profileKind?: string;
  serviceName?: string;
  lastSeenAt?: string;
}

export function isProcessGroupAlive(
  _processGroupId: string,
  _opts?: { timeoutMs?: number }
): Promise<boolean> {
  return Promise.resolve(false);
}

export function getProcessGroupStatus(
  _processGroupId: string
): Promise<ProcessGroupStatus | null> {
  return Promise.resolve(null);
}

export function terminateLocalService(
  input: { pid: number; processGroupId?: number | string | null },
  opts?: { timeoutMs?: number; signal?: NodeJS.Signals },
): Promise<boolean> {
  const timeoutMs = Math.max(100, opts?.timeoutMs ?? 2_000);
  const signal = opts?.signal ?? "SIGTERM";
  const processGroupId = Number(input.processGroupId ?? 0);
  const target =
    process.platform !== "win32" && Number.isInteger(processGroupId) && processGroupId > 0
      ? -processGroupId
      : input.pid;

  function isAlive() {
    try {
      process.kill(input.pid, 0);
      return true;
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "ESRCH") {
        return false;
      }
      return true;
    }
  }

  async function waitForExit(deadline: number) {
    while (Date.now() < deadline) {
      if (!isAlive()) return true;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return !isAlive();
  }

  return (async () => {
    try {
      process.kill(target, signal);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "ESRCH") {
        return false;
      }
    }

    if (await waitForExit(Date.now() + timeoutMs)) return true;

    try {
      process.kill(target, "SIGKILL");
    } catch {
      return !isAlive();
    }
    return waitForExit(Date.now() + 1_000);
  })();
}

export interface CreateLocalServiceKeyInput {
  profileKind: string;
  serviceName: string;
  cwd: string;
  command: string;
  envFingerprint: string;
  port: number | null;
  scope: {
    scopeType: string;
    scopeId: string;
    executionWorkspaceId: string | null;
    reuseKey?: string | null;
  };
}

export function createLocalServiceKey(_input?: CreateLocalServiceKeyInput): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function findLocalServiceRegistryRecordByRuntimeServiceId(
  _input: string | { runtimeServiceId: string; profileKind?: string }
): Promise<LocalServiceRegistryRecord | null> {
  return null;
}

export interface FindAdoptableLocalServiceInput {
  serviceKey: string;
  command: string | null;
  cwd: string;
  envFingerprint: string;
  port: number | null;
  reuseKey?: string | null;
}

export async function findAdoptableLocalService(
  _input: string | FindAdoptableLocalServiceInput,
  _opts?: { reuseKey?: string }
): Promise<LocalServiceRegistryRecord | null> {
  return null;
}

export async function readLocalServicePortOwner(
  _port: number
): Promise<LocalServiceRegistryRecord | null> {
  return null;
}

export async function removeLocalServiceRegistryRecord(
  _serviceKey: string
): Promise<void> {
  return;
}

export async function touchLocalServiceRegistryRecord(
  _serviceKey: string,
  _opts?: { runtimeServiceId?: string; lastSeenAt?: string }
): Promise<void> {
  return;
}

export async function writeLocalServiceRegistryRecord(
  _serviceKey: string,
  _record: Partial<LocalServiceRegistryRecord>
): Promise<void> {
  return;
}
