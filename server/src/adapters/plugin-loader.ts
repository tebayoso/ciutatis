import { createRequire } from "node:module";
import path from "node:path";
import type { ServerAdapterModule } from "./types.js";
import {
  getAdapterPluginByType,
  getAdapterPluginsDir,
  getDisabledAdapterTypes,
  listAdapterPlugins,
  type AdapterPluginRecord,
} from "../services/adapter-plugin-store.js";

const require = createRequire(import.meta.url);

function isServerAdapterModule(value: unknown): value is ServerAdapterModule {
  if (!value || typeof value !== "object") return false;
  const adapter = value as Partial<ServerAdapterModule>;
  return typeof adapter.type === "string" &&
    typeof adapter.execute === "function" &&
    typeof adapter.testEnvironment === "function";
}

function unwrapAdapterModule(moduleValue: unknown): ServerAdapterModule {
  if (isServerAdapterModule(moduleValue)) return moduleValue;
  if (moduleValue && typeof moduleValue === "object") {
    const candidates = [
      (moduleValue as { default?: unknown }).default,
      (moduleValue as { adapter?: unknown }).adapter,
      (moduleValue as { serverAdapter?: unknown }).serverAdapter,
    ];
    for (const candidate of candidates) {
      if (isServerAdapterModule(candidate)) return candidate;
    }
  }
  throw new Error("External adapter package did not export a server adapter module");
}

function resolveFromManagedInstall(packageName: string): string {
  return require.resolve(packageName, {
    paths: [
      path.join(getAdapterPluginsDir(), "node_modules"),
      getAdapterPluginsDir(),
      process.cwd(),
    ],
  });
}

export async function loadExternalAdapterPackage(packageName: string): Promise<ServerAdapterModule> {
  const resolved = resolveFromManagedInstall(packageName);
  return unwrapAdapterModule(await import(resolved));
}

export async function buildExternalAdapters(
  records: AdapterPluginRecord[] = listAdapterPlugins(),
): Promise<ServerAdapterModule[]> {
  const disabled = new Set(getDisabledAdapterTypes());
  const adapters: ServerAdapterModule[] = [];
  for (const record of records) {
    if (disabled.has(record.type)) continue;
    adapters.push(await loadExternalAdapterPackage(record.packageName));
  }
  return adapters;
}

export async function reloadExternalAdapter(type: string): Promise<ServerAdapterModule> {
  const record = getAdapterPluginByType(type);
  if (!record) throw new Error(`External adapter is not installed: ${type}`);
  return loadExternalAdapterPackage(record.packageName);
}

export function getUiParserSource(_type: string): string | null {
  return null;
}

export async function getOrExtractUiParserSource(type: string): Promise<string | null> {
  return getUiParserSource(type);
}
