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
  _input: { pid: number; processGroupId?: number | string | null },
  _opts?: { timeoutMs?: number; signal?: NodeJS.Signals }
): Promise<boolean> {
  return Promise.resolve(false);
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
