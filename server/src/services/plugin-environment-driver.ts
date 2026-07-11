// Stub - plugin-environment-driver not in Ciutatis V1 scope
// This file exists only to satisfy upstream imports
import type { Db } from "@paperclipai/db";
import type {
  EnvironmentProbeResult,
  PluginEnvironmentConfig,
  PluginEnvironmentDriverDeclaration,
} from "@paperclipai/shared";
  PluginEnvironmentExecuteParams,
  PluginEnvironmentExecuteResult,
  PluginEnvironmentInteractiveSetupSession,
  PluginEnvironmentStartInteractiveSetupParams,
  PluginEnvironmentGetInteractiveSetupParams,
  PluginEnvironmentCaptureTemplateParams,
  PluginEnvironmentCaptureTemplateResult,
  PluginEnvironmentCancelInteractiveSetupParams,
  PluginEnvironmentCancelInteractiveSetupResult,
  PluginEnvironmentDeleteTemplateParams,
  PluginEnvironmentDeleteTemplateResult,
  PluginEnvironmentLease,
  PluginEnvironmentRealizeWorkspaceParams,
  PluginEnvironmentRealizeWorkspaceResult,
} from "@paperclipai/plugin-sdk";
import { unprocessable } from "../errors.js";
import { pluginRegistryService } from "./plugin-registry.js";
import type { PluginWorkerManager } from "./plugin-worker-manager.js";

export interface PluginEnvironmentDriverService {
  provision(): Promise<void>;
  teardown(): Promise<void>;
}

export function pluginEnvironmentDriverService(): PluginEnvironmentDriverService {
  return {
    async provision() {
      // No-op
    },
    async teardown() {
      // No-op
    },
  };
}

// Stub exports for upstream compatibility
export interface PluginSandboxProviderDriver {
  plugin: {
    id: string;
    pluginKey: string;
    status: "ready" | "pending" | "error";
    name?: string;
    version?: string;
  };
  driver?: {
    id: string;
    pluginKey: string;
    config?: Record<string, unknown>;
    configSchema?: Record<string, unknown>;
  };
}

export function listReadyPluginEnvironmentDrivers(): unknown[] {
  return [];
}

export function resolvePluginSandboxProviderDriverByKey(_input?: {
  db?: unknown;
  driverKey?: string;
  workerManager?: unknown;
  requireRunning?: boolean;
}): PluginSandboxProviderDriver | undefined {
  return undefined;
}

export function validatePluginEnvironmentDriverConfig(_input?: {
  db?: unknown;
  workerManager?: unknown;
  driverKey?: string;
  config?: Record<string, unknown>;
}): Promise<{ valid: boolean; errors: string[]; normalizedConfig?: Record<string, unknown>; driver?: { driverKey: string; configSchema?: Record<string, unknown> } }> {
  return Promise.resolve({ valid: true, errors: [], normalizedConfig: {}, driver: { driverKey: "stub" } });
export async function listReadyPluginEnvironmentDrivers(input: {
  db: Db;
  workerManager?: PluginWorkerManager;
}) {
  if (!input.workerManager) return [];
  const pluginRegistry = pluginRegistryService(input.db);
  const plugins = await pluginRegistry.list();
  return plugins.flatMap((plugin) => {
    if (plugin.status !== "ready" || !input.workerManager?.isRunning(plugin.id)) return [];
    return (plugin.manifestJson.environmentDrivers ?? [])
      .filter((driver) => driver.kind === "sandbox_provider")
      .map((driver) => ({
        pluginId: plugin.id,
        pluginKey: plugin.pluginKey,
        driverKey: driver.driverKey,
        displayName: driver.displayName,
        description: driver.description,
        configSchema: driver.configSchema,
        supportsReusableLeases: driver.supportsReusableLeases,
        supportsInteractiveSetup: driver.supportsInteractiveSetup,
        interactiveSetupConnectionTypes: driver.interactiveSetupConnectionTypes,
        supportsTemplateCapture: driver.supportsTemplateCapture,
        templateRefKind: driver.templateRefKind,
        templateConfigBinding: driver.templateConfigBinding,
        supportsTemplateDelete: driver.supportsTemplateDelete,
      }));
  });
}

export function validatePluginSandboxProviderConfig(_input?: {
  db?: unknown;
  workerManager?: unknown;
  provider?: string;
  config?: Record<string, unknown>;
}): Promise<{ valid: boolean; errors: string[]; normalizedConfig?: Record<string, unknown>; driver?: { driverKey: string; configSchema?: Record<string, unknown> } }> {
  return Promise.resolve({ valid: true, errors: [], normalizedConfig: {}, driver: { driverKey: "stub" } });
}

export function probePluginEnvironmentDriver(_input: {
  db?: unknown;
  workerManager?: unknown;
  companyId?: string;
  environmentId?: string;
  config?: Record<string, unknown>;
}): Promise<{ ok: boolean; success: boolean; driver: string; summary: string; details?: Record<string, unknown> }> {
  return Promise.resolve({
    ok: false,
    success: false,
export async function validatePluginEnvironmentDriverConfig(input: {
  db: Db;
  workerManager: PluginWorkerManager;
  config: PluginEnvironmentConfig;
}): Promise<PluginEnvironmentConfig> {
  const { plugin } = await resolvePluginEnvironmentDriver(input);
  const result = await input.workerManager.call(plugin.id, "environmentValidateConfig", {
    driverKey: input.config.driverKey,
    config: input.config.driverConfig,
  });

  if (!result.ok) {
    throw unprocessable(
      result.errors?.[0] ?? `Plugin environment driver "${pluginDriverProviderKey(input.config)}" rejected its config.`,
      {
        errors: result.errors ?? [],
        warnings: result.warnings ?? [],
      },
    );
  }

  return {
    ...input.config,
    driverConfig: result.normalizedConfig ?? input.config.driverConfig,
  };
}

export async function probePluginEnvironmentDriver(input: {
  companyId: string;
  environmentId: string;
}): Promise<EnvironmentProbeResult> {
  const result = await input.workerManager.call(plugin.id, "environmentProbe", {
    companyId: input.companyId,
    environmentId: input.environmentId,
  }, 120_000);

    ok: result.ok,
    driver: "plugin",
    summary: "Plugin environment driver not available in Ciutatis",
    details: {},
  });
}

export function probePluginSandboxProviderDriver(_input: {
  db?: unknown;
  workerManager?: unknown;
  companyId?: string;
  environmentId?: string;
  provider?: string;
  config?: Record<string, unknown>;
}): Promise<{ ok: boolean; success: boolean; driver: string; summary: string; details?: Record<string, unknown> }> {
  return Promise.resolve({
    ok: false,
    success: false,
    driver: "sandbox",
    summary: "Plugin sandbox provider not available in Ciutatis",
    details: {},
  });
}

export function destroyPluginEnvironmentLease(_input?: {
  db?: unknown;
  workerManager?: unknown;
  companyId?: string | null;
  environmentId?: string;
  config?: Record<string, unknown>;
  providerLeaseId?: string | null;
  leaseMetadata?: Record<string, unknown>;
}): Promise<void> {
  return Promise.resolve();
export async function probePluginSandboxProviderDriver(input: {
  db: Db;
  workerManager: PluginWorkerManager;
  companyId: string;
  environmentId: string;
  provider: string;
  config: Record<string, unknown>;
}): Promise<EnvironmentProbeResult> {
  const resolved = await resolvePluginEnvironmentDriverByKey({
    db: input.db,
    workerManager: input.workerManager,
    driverKey: input.provider,
  if (!resolved) {
    return {
      ok: false,
      driver: "sandbox",
      summary: `Sandbox provider "${input.provider}" is not installed or its plugin worker is not running.`,
      details: {
        provider: input.provider,
      },
    };
  }
  const { provider: _provider, ...driverConfig } = input.config;
  const result = await input.workerManager.call(resolved.plugin.id, "environmentProbe", {
    driverKey: input.provider,
    companyId: input.companyId,
    environmentId: input.environmentId,
    config: driverConfig,
  }, 120_000);
  return {
    ok: result.ok,
    summary: result.summary ?? `Sandbox provider "${input.provider}" probe ${result.ok ? "passed" : "failed"}.`,
    details: {
      provider: input.provider,
      pluginKey: resolved.plugin.pluginKey,
      diagnostics: result.diagnostics ?? [],
      metadata: result.metadata ?? {},
    },
  };
export async function resumePluginEnvironmentLease(input: {
  db: Db;
  workerManager: PluginWorkerManager;
  companyId: string;
  environmentId: string;
  issueId?: string | null;
  config: PluginEnvironmentConfig;
  providerLeaseId: string;
}): Promise<PluginEnvironmentLease> {
  const { plugin } = await resolvePluginEnvironmentDriver(input);
  return await input.workerManager.call(plugin.id, "environmentResumeLease", {
    driverKey: input.config.driverKey,
    companyId: input.companyId,
    environmentId: input.environmentId,
    issueId: input.issueId ?? null,
    config: input.config.driverConfig,
    providerLeaseId: input.providerLeaseId,
    leaseMetadata: input.leaseMetadata,
export async function destroyPluginEnvironmentLease(input: {
  db: Db;
  workerManager: PluginWorkerManager;
  companyId: string;
  environmentId: string;
  issueId?: string | null;
  config: PluginEnvironmentConfig;
  providerLeaseId: string | null;
  const { plugin } = await resolvePluginEnvironmentDriver(input);
  await input.workerManager.call(plugin.id, "environmentDestroyLease", {
    driverKey: input.config.driverKey,
    companyId: input.companyId,
    environmentId: input.environmentId,
    issueId: input.issueId ?? null,
    config: input.config.driverConfig,
    providerLeaseId: input.providerLeaseId,
    leaseMetadata: input.leaseMetadata,
}

export function executePluginEnvironmentCommand(_input?: {
  db?: unknown;
  workerManager?: unknown;
  pluginId?: string;
  config?: Record<string, unknown>;
  params?: Record<string, unknown>;
}): Promise<{ exitCode: number; stdout: string; stderr: string; timedOut: boolean }> {
  return Promise.resolve({ exitCode: 0, stdout: "", stderr: "", timedOut: false });
}

export function realizePluginEnvironmentWorkspace(_input?: {
  db?: unknown;
  workerManager?: unknown;
  pluginId?: string;
  config?: Record<string, unknown>;
  params?: Record<string, unknown>;
}): Promise<{ cwd: string; metadata: Record<string, unknown> }> {
  return Promise.resolve({ cwd: "/tmp", metadata: {} });
}

export async function startPluginEnvironmentInteractiveSetup(input: {
  db: Db;
  workerManager: PluginWorkerManager;
  config: PluginEnvironmentConfig;
  params: Omit<PluginEnvironmentStartInteractiveSetupParams, "driverKey" | "config">;
}): Promise<PluginEnvironmentInteractiveSetupSession> {
  const { plugin } = await resolvePluginEnvironmentDriver({
    db: input.db,
    workerManager: input.workerManager,
    config: input.config,
  });
  return await input.workerManager.call(plugin.id, "environmentStartInteractiveSetup", {
    ...input.params,
    driverKey: input.config.driverKey,
    config: input.config.driverConfig,
  }, resolvePluginExecuteRpcTimeoutMs({
    requestedTimeoutMs: undefined,
    config: input.config.driverConfig,
  }));
}

export async function getPluginEnvironmentInteractiveSetup(input: {
  db: Db;
  workerManager: PluginWorkerManager;
  config: PluginEnvironmentConfig;
  params: Omit<PluginEnvironmentGetInteractiveSetupParams, "driverKey" | "config">;
}): Promise<PluginEnvironmentInteractiveSetupSession> {
  const { plugin } = await resolvePluginEnvironmentDriver({
    db: input.db,
    workerManager: input.workerManager,
    config: input.config,
  });
  return await input.workerManager.call(plugin.id, "environmentGetInteractiveSetup", {
    ...input.params,
    driverKey: input.config.driverKey,
    config: input.config.driverConfig,
  }, resolvePluginExecuteRpcTimeoutMs({
    requestedTimeoutMs: undefined,
    config: input.config.driverConfig,
  }));
}

export async function capturePluginEnvironmentTemplate(input: {
  db: Db;
  workerManager: PluginWorkerManager;
  config: PluginEnvironmentConfig;
  params: Omit<PluginEnvironmentCaptureTemplateParams, "driverKey" | "config">;
}): Promise<PluginEnvironmentCaptureTemplateResult> {
  const { plugin } = await resolvePluginEnvironmentDriver({
    db: input.db,
    workerManager: input.workerManager,
    config: input.config,
  });
  return await input.workerManager.call(plugin.id, "environmentCaptureTemplate", {
    ...input.params,
    driverKey: input.config.driverKey,
    config: input.config.driverConfig,
  }, resolvePluginExecuteRpcTimeoutMs({
    requestedTimeoutMs: input.params.timeoutMs ?? undefined,
    config: input.config.driverConfig,
  }));
}

export async function cancelPluginEnvironmentInteractiveSetup(input: {
  db: Db;
  workerManager: PluginWorkerManager;
  config: PluginEnvironmentConfig;
  params: Omit<PluginEnvironmentCancelInteractiveSetupParams, "driverKey" | "config">;
}): Promise<PluginEnvironmentCancelInteractiveSetupResult> {
  const { plugin } = await resolvePluginEnvironmentDriver({
    db: input.db,
    workerManager: input.workerManager,
    config: input.config,
  });
  return await input.workerManager.call(plugin.id, "environmentCancelInteractiveSetup", {
    ...input.params,
    driverKey: input.config.driverKey,
    config: input.config.driverConfig,
  }, resolvePluginExecuteRpcTimeoutMs({
    requestedTimeoutMs: undefined,
    config: input.config.driverConfig,
  }));
}

export async function deletePluginEnvironmentTemplate(input: {
  db: Db;
  workerManager: PluginWorkerManager;
  config: PluginEnvironmentConfig;
  params: Omit<PluginEnvironmentDeleteTemplateParams, "driverKey" | "config">;
}): Promise<PluginEnvironmentDeleteTemplateResult> {
  const { plugin } = await resolvePluginEnvironmentDriver({
    db: input.db,
    workerManager: input.workerManager,
    config: input.config,
  });
  return await input.workerManager.call(plugin.id, "environmentDeleteTemplate", {
    ...input.params,
    driverKey: input.config.driverKey,
    config: input.config.driverConfig,
  }, resolvePluginExecuteRpcTimeoutMs({
    requestedTimeoutMs: undefined,
    config: input.config.driverConfig,
  }));
}

const RPC_OVERHEAD_BUFFER_MS = 30_000;

export function resolvePluginExecuteRpcTimeoutMs(input: {
  requestedTimeoutMs?: number | undefined;
  config?: Record<string, unknown> | null;
}): number {
  return input.requestedTimeoutMs ?? 60000;
}

export function resumePluginEnvironmentLease(_input?: {
  db?: unknown;
  workerManager?: unknown;
  companyId?: string | null;
  environmentId?: string;
  config?: Record<string, unknown>;
  providerLeaseId?: string;
  leaseMetadata?: Record<string, unknown>;
}): Promise<{ providerLeaseId: string; expiresAt?: string | null; metadata?: Record<string, unknown> }> {
  return Promise.resolve({ providerLeaseId: "stub" });
}
