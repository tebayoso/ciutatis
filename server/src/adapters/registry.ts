import type { ServerAdapterModule } from "./types.js";
import { getAdapterSessionManagement } from "@ciutatis/adapter-utils";
import {
  execute as geminiExecute,
  testEnvironment as geminiTestEnvironment,
  sessionCodec as geminiSessionCodec,
} from "@ciutatis/adapter-gemini-local/server";
import { agentConfigurationDoc as geminiAgentConfigurationDoc, models as geminiModels } from "@ciutatis/adapter-gemini-local";
import { processAdapter } from "./process/index.js";
import { httpAdapter } from "./http/index.js";

const geminiLocalAdapter: ServerAdapterModule = {
  type: "gemini_local",
  execute: geminiExecute,
  testEnvironment: geminiTestEnvironment,
  sessionCodec: geminiSessionCodec,
  sessionManagement: getAdapterSessionManagement("gemini_local") ?? undefined,
  models: geminiModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: geminiAgentConfigurationDoc,
};

const adaptersByType = new Map<string, ServerAdapterModule>(
  [
    geminiLocalAdapter,
    processAdapter,
    httpAdapter,
  ].map((a) => [a.type, a]),
);

export function getServerAdapter(type: string): ServerAdapterModule {
  const adapter = adaptersByType.get(type);
  if (!adapter) {
    // Fall back to process adapter for unknown types
    return processAdapter;
  }
  return adapter;
}

export async function listAdapterModels(type: string): Promise<{ id: string; label: string }[]> {
  const adapter = adaptersByType.get(type);
  if (!adapter) return [];
  if (adapter.listModels) {
    const discovered = await adapter.listModels();
    if (discovered.length > 0) return discovered;
  }
  return adapter.models ?? [];
}

export function listServerAdapters(): ServerAdapterModule[] {
  return Array.from(adaptersByType.values());
}

export function findServerAdapter(type: string): ServerAdapterModule | null {
  return adaptersByType.get(type) ?? null;
}
