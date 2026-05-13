import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AdapterPluginRecord {
  packageName: string;
  type: string;
  installedAt: string;
  packagePath?: string | null;
}

interface AdapterPluginStoreFile {
  records: AdapterPluginRecord[];
  disabledAdapterTypes: string[];
}

const STORE_FILE_NAME = "adapters.json";

export function getAdapterPluginsDir(): string {
  return process.env.PAPERCLIP_ADAPTER_PLUGINS_DIR?.trim() || path.join(os.homedir(), ".paperclip", "adapters");
}

function getStorePath() {
  return path.join(getAdapterPluginsDir(), STORE_FILE_NAME);
}

function emptyStore(): AdapterPluginStoreFile {
  return { records: [], disabledAdapterTypes: [] };
}

function normalizeStore(value: unknown): AdapterPluginStoreFile {
  if (Array.isArray(value)) {
    return {
      records: value.filter(isAdapterPluginRecord),
      disabledAdapterTypes: [],
    };
  }
  if (!value || typeof value !== "object") return emptyStore();
  const raw = value as Partial<AdapterPluginStoreFile>;
  return {
    records: Array.isArray(raw.records) ? raw.records.filter(isAdapterPluginRecord) : [],
    disabledAdapterTypes: Array.isArray(raw.disabledAdapterTypes)
      ? raw.disabledAdapterTypes.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      : [],
  };
}

function isAdapterPluginRecord(value: unknown): value is AdapterPluginRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AdapterPluginRecord>;
  return typeof record.packageName === "string" && record.packageName.length > 0 &&
    typeof record.type === "string" && record.type.length > 0 &&
    typeof record.installedAt === "string" && record.installedAt.length > 0;
}

function readStore(): AdapterPluginStoreFile {
  const storePath = getStorePath();
  if (!existsSync(storePath)) return emptyStore();
  try {
    return normalizeStore(JSON.parse(readFileSync(storePath, "utf8")));
  } catch {
    return emptyStore();
  }
}

function writeStore(store: AdapterPluginStoreFile): void {
  const dir = getAdapterPluginsDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(getStorePath(), `${JSON.stringify(store, null, 2)}\n`);
}

export function listAdapterPlugins(): AdapterPluginRecord[] {
  return readStore().records;
}

export function getAdapterPluginByType(type: string): AdapterPluginRecord | null {
  return listAdapterPlugins().find((record) => record.type === type) ?? null;
}

export function addAdapterPlugin(record: AdapterPluginRecord): void {
  const store = readStore();
  const records = store.records.filter((entry) => entry.type !== record.type);
  records.push(record);
  writeStore({ ...store, records });
}

export function removeAdapterPlugin(type: string): boolean {
  const store = readStore();
  const records = store.records.filter((record) => record.type !== type);
  const disabledAdapterTypes = store.disabledAdapterTypes.filter((entry) => entry !== type);
  writeStore({ records, disabledAdapterTypes });
  return records.length !== store.records.length || disabledAdapterTypes.length !== store.disabledAdapterTypes.length;
}

export function getDisabledAdapterTypes(): string[] {
  return readStore().disabledAdapterTypes;
}

export function setAdapterDisabled(type: string, disabled: boolean): boolean {
  const store = readStore();
  const disabledAdapterTypes = new Set(store.disabledAdapterTypes);
  if (disabled) {
    disabledAdapterTypes.add(type);
  } else {
    disabledAdapterTypes.delete(type);
  }
  writeStore({ ...store, disabledAdapterTypes: Array.from(disabledAdapterTypes).sort() });
  return true;
}
