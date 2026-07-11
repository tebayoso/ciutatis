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
export async function writeLocalServiceRegistryRecord(record: LocalServiceRegistryRecord) {
  await fs.mkdir(getRuntimeServicesDir(), { recursive: true });
  await fs.writeFile(
    getRuntimeServiceRegistryPath(record.serviceKey),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  );
export async function removeLocalServiceRegistryRecord(serviceKey: string) {
  await fs.rm(getRuntimeServiceRegistryPath(serviceKey), { force: true });
export async function readLocalServiceRegistryRecord(serviceKey: string) {
  return await safeReadRegistryRecord(getRuntimeServiceRegistryPath(serviceKey));
export async function listLocalServiceRegistryRecords(filter?: {
  profileKind?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const entries = await fs.readdir(getRuntimeServicesDir(), { withFileTypes: true });
    const records = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => safeReadRegistryRecord(path.resolve(getRuntimeServicesDir(), entry.name))),
    );
    return records
      .filter((record): record is LocalServiceRegistryRecord => record !== null)
      .filter((record) => {
        if (filter?.profileKind && record.profileKind !== filter.profileKind) return false;
        if (!filter?.metadata) return true;
        return Object.entries(filter.metadata).every(([key, value]) => record.metadata?.[key] === value);
      })
      .sort((left, right) => left.serviceKey.localeCompare(right.serviceKey));
  } catch {
    return [];
  }
export async function findLocalServiceRegistryRecordByRuntimeServiceId(input: {
  runtimeServiceId: string;
  profileKind?: string;
}) {
  const records = await listLocalServiceRegistryRecords(
    input.profileKind ? { profileKind: input.profileKind } : undefined,
  );
  const record = records.find((entry) => entry.runtimeServiceId === input.runtimeServiceId) ?? null;
  if (!record) return null;
  let candidate = record;
  if (!isPidAlive(candidate.pid)) {
    const ownerPid = candidate.port ? await readLocalServicePortOwner(candidate.port) : null;
    if (!ownerPid) {
      await removeLocalServiceRegistryRecord(candidate.serviceKey);
      return null;
    }
    candidate = {
      ...candidate,
      pid: ownerPid,
      processGroupId: candidate.processGroupId && isPidAlive(candidate.processGroupId) ? candidate.processGroupId : ownerPid,
      lastSeenAt: new Date().toISOString(),
    };
    await writeLocalServiceRegistryRecord(candidate);
  }
  if (!(await isLikelyMatchingCommand(candidate))) {
    await removeLocalServiceRegistryRecord(record.serviceKey);
    return null;
  }
  if (!(await doesLocalServiceRecordMatchCwd(candidate))) {
    await removeLocalServiceRegistryRecord(record.serviceKey);
    return null;
  }
  return candidate;
export function isPidAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
export function isProcessGroupAlive(processGroupId: number | null | undefined) {
  if (process.platform === "win32") return false;
  if (typeof processGroupId !== "number" || !Number.isInteger(processGroupId) || processGroupId <= 0) return false;
  try {
    process.kill(-processGroupId, 0);
    return true;
  } catch {
    return false;
  }
async function isLikelyMatchingCommand(record: LocalServiceRegistryRecord) {
  if (process.platform === "win32") return true;
  try {
    const { stdout } = await execFileAsync("ps", ["-o", "command=", "-p", String(record.pid)]);
    const commandLine = stdout.trim();
    if (!commandLine) return false;
    const normalize = (value: string) => value.replace(/["']/g, "").replace(/\s+/g, " ").trim();
    const normalizedCommandLine = normalize(commandLine);
    const normalizedRecordedCommand = normalize(record.command);
    return normalizedCommandLine.includes(normalizedRecordedCommand) || normalizedCommandLine.includes(record.serviceName);
  } catch {
    return true;
  }
export async function findAdoptableLocalService(input: {
  profileKind?: string | null;
  serviceName?: string | null;
  command?: string | null;
  cwd?: string | null;
  envFingerprint?: string | null;
  port?: number | null;
  url?: string | null;
}) {
  const record =
    await readLocalServiceRegistryRecord(input.serviceKey)
    ?? await adoptLocalServiceFromPortOwner(input);
  if (!record) return null;
  if (!isPidAlive(record.pid)) {
    await removeLocalServiceRegistryRecord(input.serviceKey);
    return null;
  }
  if (!(await isLikelyMatchingCommand(record))) {
    await removeLocalServiceRegistryRecord(input.serviceKey);
    return null;
  }
  if (!(await doesLocalServiceRecordMatchCwd(record))) {
    await removeLocalServiceRegistryRecord(input.serviceKey);
    return null;
  }
  if (input.command && record.command !== input.command) return null;
  if (input.cwd && path.resolve(record.cwd) !== path.resolve(input.cwd)) return null;
  if (input.envFingerprint && record.envFingerprint !== input.envFingerprint) return null;
  if (input.port !== undefined && input.port !== null && record.port !== input.port) return null;
  return record;
}

async function readProcessGroupId(pid: number) {
  if (process.platform === "win32") return null;
  try {
    const { stdout } = await execFileAsync("ps", ["-o", "pgid=", "-p", String(pid)]);
    const parsed = Number.parseInt(stdout.trim(), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function adoptLocalServiceFromPortOwner(input: {
  serviceKey: string;
  profileKind?: string | null;
  serviceName?: string | null;
  command?: string | null;
  cwd?: string | null;
  envFingerprint?: string | null;
  port?: number | null;
  url?: string | null;
}) {
  if (!input.port) return null;
  const ownerPid = await readLocalServicePortOwner(input.port);
  if (!ownerPid) return null;

  if (input.cwd) {
    const ownerCwd = await readLocalServiceProcessCwd(ownerPid);
    if (!ownerCwd || !(await isLocalServiceProcessInWorkspace(ownerCwd, input.cwd))) {
      return null;
    }
  }

  const processGroupId = await readProcessGroupId(ownerPid);
  const pid = processGroupId && isPidAlive(processGroupId) ? processGroupId : ownerPid;
  const now = new Date().toISOString();
  const record: LocalServiceRegistryRecord = {
    version: 1,
    serviceKey: input.serviceKey,
    profileKind: input.profileKind ?? "workspace-runtime",
    serviceName: input.serviceName ?? "service",
    command: input.command ?? input.serviceName ?? "service",
    cwd: input.cwd ?? process.cwd(),
    envFingerprint: input.envFingerprint ?? "",
    port: input.port,
    url: input.url ?? null,
    pid,
    processGroupId: processGroupId ?? pid,
    provider: "local_process",
    runtimeServiceId: null,
    reuseKey: input.envFingerprint ?? null,
    startedAt: now,
    lastSeenAt: now,
    metadata: null,
  };

  if (!(await isLikelyMatchingCommand(record))) return null;
  await writeLocalServiceRegistryRecord(record);
  return record;
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
export async function terminateLocalService(
  record: Pick<LocalServiceRegistryRecord, "pid" | "processGroupId">,
  opts?: { signal?: NodeJS.Signals; forceAfterMs?: number },
) {
  const signal = opts?.signal ?? "SIGTERM";
  const targetProcessGroup = process.platform !== "win32" && record.processGroupId && record.processGroupId > 0;
  try {
    if (targetProcessGroup) {
      process.kill(-record.processGroupId!, signal);
    } else {
      process.kill(record.pid, signal);
    }
  } catch {
    return;
  }

  const deadline = Date.now() + (opts?.forceAfterMs ?? 2_000);
  while (Date.now() < deadline) {
    const targetAlive = targetProcessGroup
      ? isProcessGroupAlive(record.processGroupId)
      : isPidAlive(record.pid);
    if (!targetAlive) {
      return;
    await delay(100);

  const stillAlive = targetProcessGroup
    ? isProcessGroupAlive(record.processGroupId)
    : isPidAlive(record.pid);
  if (!stillAlive) return;
      process.kill(-record.processGroupId!, "SIGKILL");
      process.kill(record.pid, "SIGKILL");
    // Ignore cleanup races.
}

export async function readLocalServicePortOwner(port: number) {
  if (!Number.isInteger(port) || port <= 0 || process.platform === "win32") return null;
    const { stdout } = await execFileAsync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
    const firstPid = stdout
      .split("\n")
      .map((line) => Number.parseInt(line.trim(), 10))
      .find((value) => Number.isInteger(value) && value > 0);
    return firstPid ?? null;
    return null;
}

export async function readLocalServiceProcessCwd(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0 || process.platform !== "linux") return null;
  try {
    return await fs.readlink(`/proc/${pid}/cwd`);
  } catch {
    return null;
  }
}

export async function isLocalServiceProcessInWorkspace(processCwd: string, workspaceCwd: string) {
  try {
    const [resolvedProcessCwd, resolvedWorkspaceCwd] = await Promise.all([
      fs.realpath(processCwd),
      fs.realpath(workspaceCwd),
    ]);
    const relativePath = path.relative(resolvedWorkspaceCwd, resolvedProcessCwd);
    return relativePath === "" || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== "..");
  } catch {
    return false;
  }
}

export async function isLocalServiceRegistryCwdCompatible(processCwd: string | null, workspaceCwd: string) {
  if (!processCwd) return process.platform !== "linux";
  return isLocalServiceProcessInWorkspace(processCwd, workspaceCwd);
}

async function doesLocalServiceRecordMatchCwd(record: LocalServiceRegistryRecord) {
  if (!record.port) return true;
  const ownerPid = await readLocalServicePortOwner(record.port);
  if (!ownerPid) return false;
  const ownerCwd = await readLocalServiceProcessCwd(ownerPid);
  return isLocalServiceRegistryCwdCompatible(ownerCwd, record.cwd);
}
