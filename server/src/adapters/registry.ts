import type {
  AdapterModel,
  AdapterModelProfileDefinition,
  AdapterRuntimeCommandSpec,
  ServerAdapterModule,
} from "./types.js";
import { getAdapterSessionManagement } from "@paperclipai/adapter-utils";
import {
  execute as claudeExecute,
  testEnvironment as claudeTestEnvironment,
  sessionCodec as claudeSessionCodec,
  getQuotaWindows as claudeGetQuotaWindows,
} from "@paperclipai/adapter-claude-local/server";
import {
  agentConfigurationDoc as claudeAgentConfigurationDoc,
  models as claudeModels,
  modelProfiles as claudeModelProfiles,
} from "@paperclipai/adapter-claude-local";
import {
  execute as codexExecute,
  testEnvironment as codexTestEnvironment,
  sessionCodec as codexSessionCodec,
  getQuotaWindows as codexGetQuotaWindows,
} from "@paperclipai/adapter-codex-local/server";
import {
  agentConfigurationDoc as codexAgentConfigurationDoc,
  models as codexModels,
  modelProfiles as codexModelProfiles,
} from "@paperclipai/adapter-codex-local";
import {
  execute as cursorExecute,
  testEnvironment as cursorTestEnvironment,
  sessionCodec as cursorSessionCodec,
} from "@paperclipai/adapter-cursor-local/server";
import {
  agentConfigurationDoc as cursorAgentConfigurationDoc,
  models as cursorModels,
  modelProfiles as cursorModelProfiles,
} from "@paperclipai/adapter-cursor-local";
import {
  execute as geminiExecute,
  testEnvironment as geminiTestEnvironment,
  sessionCodec as geminiSessionCodec,
} from "@paperclipai/adapter-gemini-local/server";
import {
  agentConfigurationDoc as geminiAgentConfigurationDoc,
  models as geminiModels,
} from "@paperclipai/adapter-gemini-local";
import {
  execute as openCodeExecute,
  testEnvironment as openCodeTestEnvironment,
  sessionCodec as openCodeSessionCodec,
  listOpenCodeModels,
} from "@paperclipai/adapter-opencode-local/server";
import {
  agentConfigurationDoc as openCodeAgentConfigurationDoc,
  models as openCodeModels,
  modelProfiles as openCodeModelProfiles,
} from "@paperclipai/adapter-opencode-local";
import {
  execute as openclawGatewayExecute,
  testEnvironment as openclawGatewayTestEnvironment,
} from "@paperclipai/adapter-openclaw-gateway/server";
import {
  agentConfigurationDoc as openclawGatewayAgentConfigurationDoc,
  models as openclawGatewayModels,
} from "@paperclipai/adapter-openclaw-gateway";
import {
  execute as cloudflareWorkersAiExecute,
  testEnvironment as cloudflareWorkersAiTestEnvironment,
} from "@ciutatis/adapter-cloudflare-workers-ai/server";
import {
  agentConfigurationDoc as cloudflareWorkersAiAgentConfigurationDoc,
  models as cloudflareWorkersAiModels,
} from "@ciutatis/adapter-cloudflare-workers-ai";
import { listCodexModels, refreshCodexModels } from "./codex-models.js";
import { listCursorModels } from "./cursor-models.js";
import {
  execute as piExecute,
  testEnvironment as piTestEnvironment,
  sessionCodec as piSessionCodec,
  listPiModels,
} from "@paperclipai/adapter-pi-local/server";
import {
  agentConfigurationDoc as piAgentConfigurationDoc,
  modelProfiles as piModelProfiles,
} from "@paperclipai/adapter-pi-local";
import { processAdapter } from "./process/index.js";
import { httpAdapter } from "./http/index.js";

function dedupeAdapterModels(models: AdapterModel[]): AdapterModel[] {
  const seen = new Set<string>();
  const result: AdapterModel[] = [];
  for (const model of models) {
    const id = model.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({ ...model, id });
  }
  return result;
}

function prefixAdapterModelLabels(models: AdapterModel[], provider: "Claude" | "Codex"): AdapterModel[] {
  const prefix = `${provider}: `;
  return models.map((model) => ({
    ...model,
    label: model.label.startsWith(prefix) ? model.label : `${prefix}${model.label}`,
  }));
}

function buildNpmRuntimeCommandSpec(
  config: Record<string, unknown>,
  fallbackCommand: string,
  packageName: string,
): AdapterRuntimeCommandSpec {
  const command = typeof config.command === "string" && config.command.trim() ? config.command.trim() : fallbackCommand;
  return {
    command,
    detectCommand: command,
    installCommand: `npm install -g ${packageName}`,
  };
}

function buildCursorRuntimeCommandSpec(config: Record<string, unknown>): AdapterRuntimeCommandSpec {
  const command = typeof config.command === "string" && config.command.trim() ? config.command.trim() : "agent";
  return { command, detectCommand: command, installCommand: null };
}

async function listOpenCodeModelsWithFallback(): Promise<AdapterModel[]> {
  const discovered = await listOpenCodeModels();
  return discovered.length > 0 ? dedupeAdapterModels(discovered) : openCodeModels;
}

const claudeLocalAdapter: ServerAdapterModule = {
  type: "claude_local",
  execute: claudeExecute,
  testEnvironment: claudeTestEnvironment,
  sessionCodec: claudeSessionCodec,
  sessionManagement: getAdapterSessionManagement("claude_local") ?? undefined,
  models: claudeModels,
  modelProfiles: claudeModelProfiles,
  listModels: async () => claudeModels,
  supportsLocalAgentJwt: true,
  supportsInstructionsBundle: true,
  instructionsPathKey: "instructionsFilePath",
  requiresMaterializedRuntimeSkills: false,
  getRuntimeCommandSpec: (config) => buildNpmRuntimeCommandSpec(config, "claude", "@anthropic-ai/claude-code"),
  agentConfigurationDoc: claudeAgentConfigurationDoc,
  getQuotaWindows: claudeGetQuotaWindows,
};

const codexLocalAdapter: ServerAdapterModule = {
  type: "codex_local",
  execute: codexExecute,
  testEnvironment: codexTestEnvironment,
  sessionCodec: codexSessionCodec,
  sessionManagement: getAdapterSessionManagement("codex_local") ?? undefined,
  models: codexModels,
  modelProfiles: codexModelProfiles,
  listModels: listCodexModels,
  refreshModels: refreshCodexModels,
  supportsLocalAgentJwt: true,
  supportsInstructionsBundle: true,
  instructionsPathKey: "instructionsFilePath",
  requiresMaterializedRuntimeSkills: false,
  getRuntimeCommandSpec: (config) => buildNpmRuntimeCommandSpec(config, "codex", "@openai/codex"),
  agentConfigurationDoc: codexAgentConfigurationDoc,
  getQuotaWindows: codexGetQuotaWindows,
};

const cursorLocalAdapter: ServerAdapterModule = {
  type: "cursor",
  execute: cursorExecute,
  testEnvironment: cursorTestEnvironment,
  sessionCodec: cursorSessionCodec,
  sessionManagement: getAdapterSessionManagement("cursor") ?? undefined,
  models: cursorModels,
  modelProfiles: cursorModelProfiles,
  listModels: listCursorModels,
  supportsLocalAgentJwt: true,
  supportsInstructionsBundle: true,
  instructionsPathKey: "instructionsFilePath",
  requiresMaterializedRuntimeSkills: true,
  getRuntimeCommandSpec: buildCursorRuntimeCommandSpec,
  agentConfigurationDoc: cursorAgentConfigurationDoc,
};

const geminiLocalAdapter: ServerAdapterModule = {
  type: "gemini_local",
  execute: geminiExecute,
  testEnvironment: geminiTestEnvironment,
  sessionCodec: geminiSessionCodec,
  sessionManagement: getAdapterSessionManagement("gemini_local") ?? undefined,
  models: geminiModels,
  listModels: async () => geminiModels,
  supportsLocalAgentJwt: true,
  supportsInstructionsBundle: true,
  instructionsPathKey: "instructionsFilePath",
  requiresMaterializedRuntimeSkills: true,
  getRuntimeCommandSpec: (config) => buildNpmRuntimeCommandSpec(config, "gemini", "@google/gemini-cli"),
  agentConfigurationDoc: geminiAgentConfigurationDoc,
};

const openclawGatewayAdapter: ServerAdapterModule = {
  type: "openclaw_gateway",
  execute: openclawGatewayExecute,
  testEnvironment: openclawGatewayTestEnvironment,
  models: openclawGatewayModels,
  supportsLocalAgentJwt: false,
  supportsInstructionsBundle: false,
  requiresMaterializedRuntimeSkills: false,
  agentConfigurationDoc: openclawGatewayAgentConfigurationDoc,
};

const openCodeLocalAdapter: ServerAdapterModule = {
  type: "opencode_local",
  execute: openCodeExecute,
  testEnvironment: openCodeTestEnvironment,
  sessionCodec: openCodeSessionCodec,
  models: openCodeModels,
  modelProfiles: openCodeModelProfiles,
  sessionManagement: getAdapterSessionManagement("opencode_local") ?? undefined,
  listModels: listOpenCodeModelsWithFallback,
  supportsLocalAgentJwt: true,
  supportsInstructionsBundle: true,
  instructionsPathKey: "instructionsFilePath",
  requiresMaterializedRuntimeSkills: true,
  getRuntimeCommandSpec: (config) => buildNpmRuntimeCommandSpec(config, "opencode", "opencode-ai"),
  agentConfigurationDoc: openCodeAgentConfigurationDoc,
};

const acpxLocalAdapter: ServerAdapterModule = {
  type: "acpx_local",
  execute: async () => {
    throw new Error("The ACPX local adapter is not available in this Ciutatis build.");
  },
  testEnvironment: async () => ({
    adapterType: "acpx_local",
    status: "fail",
    checks: [{
      code: "acpx_local_unavailable",
      level: "error",
      message: "The ACPX local adapter is not available in this Ciutatis build.",
    }],
    testedAt: new Date().toISOString(),
  }),
  models: dedupeAdapterModels([
    ...prefixAdapterModelLabels(claudeModels, "Claude"),
    ...prefixAdapterModelLabels(codexModels, "Codex"),
  ]),
  listModels: async () => acpxLocalAdapter.models ?? [],
  supportsLocalAgentJwt: true,
  supportsInstructionsBundle: true,
  instructionsPathKey: "instructionsFilePath",
  requiresMaterializedRuntimeSkills: true,
  agentConfigurationDoc: "ACPX local adapter compatibility entry.",
};

const cloudflareWorkersAiAdapter: ServerAdapterModule = {
  type: "cloudflare_workers_ai",
  execute: cloudflareWorkersAiExecute,
  testEnvironment: cloudflareWorkersAiTestEnvironment,
  models: cloudflareWorkersAiModels,
  listModels: async () => cloudflareWorkersAiModels,
  supportsLocalAgentJwt: false,
  supportsInstructionsBundle: true,
  instructionsPathKey: "instructionsFilePath",
  requiresMaterializedRuntimeSkills: false,
  agentConfigurationDoc: cloudflareWorkersAiAgentConfigurationDoc,
};

const piLocalAdapter: ServerAdapterModule = {
  type: "pi_local",
  execute: piExecute,
  testEnvironment: piTestEnvironment,
  sessionCodec: piSessionCodec,
  sessionManagement: getAdapterSessionManagement("pi_local") ?? undefined,
  models: [],
  modelProfiles: piModelProfiles,
  listModels: listPiModels,
  supportsLocalAgentJwt: true,
  supportsInstructionsBundle: true,
  instructionsPathKey: "instructionsFilePath",
  requiresMaterializedRuntimeSkills: true,
  getRuntimeCommandSpec: (config) => buildNpmRuntimeCommandSpec(config, "pi", "@mariozechner/pi-coding-agent"),
  agentConfigurationDoc: piAgentConfigurationDoc,
};

const adaptersByType = new Map<string, ServerAdapterModule>();
const pausedAdapterOverrides = new Set<string>();
for (const adapter of [
  claudeLocalAdapter,
  codexLocalAdapter,
  cursorLocalAdapter,
  geminiLocalAdapter,
  acpxLocalAdapter,
  openCodeLocalAdapter,
  piLocalAdapter,
  openclawGatewayAdapter,
  cloudflareWorkersAiAdapter,
  processAdapter,
  httpAdapter,
]) {
  adaptersByType.set(adapter.type, adapter);
}

export function getServerAdapter(type: string): ServerAdapterModule {
  return adaptersByType.get(type) ?? processAdapter;
}

export function findServerAdapter(type: string): ServerAdapterModule | null {
  return adaptersByType.get(type) ?? null;
}

export function findActiveServerAdapter(type: string): ServerAdapterModule | null {
  if (pausedAdapterOverrides.has(type)) return null;
  return findServerAdapter(type);
}

export function requireServerAdapter(type: string): ServerAdapterModule {
  const adapter = findActiveServerAdapter(type);
  if (!adapter) throw new Error(`Unknown adapter type: ${type}`);
  return adapter;
}

export function listServerAdapters(): ServerAdapterModule[] {
  return Array.from(adaptersByType.values());
}

export async function listAdapterModels(type: string): Promise<AdapterModel[]> {
  const adapter = findActiveServerAdapter(type);
  if (!adapter) return [];
  if (adapter.listModels) return adapter.listModels();
  return adapter.models ?? [];
}

export async function refreshAdapterModels(type: string): Promise<AdapterModel[]> {
  const adapter = findActiveServerAdapter(type);
  if (!adapter) return [];
  if (adapter.refreshModels) return adapter.refreshModels();
  if (adapter.listModels) return adapter.listModels();
  return adapter.models ?? [];
}

export async function listAdapterModelProfiles(type: string): Promise<AdapterModelProfileDefinition[]> {
  const adapter = findActiveServerAdapter(type);
  if (!adapter) return [];
  return adapter.modelProfiles ?? [];
}

export async function detectAdapterModel(
  _type: string,
): Promise<{ model: string; provider: string; source: string; candidates?: string[] } | null> {
  return null;
}

export const waitForExternalAdapters: Promise<void> = Promise.resolve();

export function registerServerAdapter(adapter: ServerAdapterModule): void {
  adaptersByType.set(adapter.type, adapter);
}

export function unregisterServerAdapter(type: string): void {
  if (type === processAdapter.type || type === httpAdapter.type) return;
  adaptersByType.delete(type);
  pausedAdapterOverrides.delete(type);
}

export function setOverridePaused(type: string, paused: boolean): void {
  if (paused) {
    pausedAdapterOverrides.add(type);
  } else {
    pausedAdapterOverrides.delete(type);
  }
}

export function isOverridePaused(type: string): boolean {
  return pausedAdapterOverrides.has(type);
}
