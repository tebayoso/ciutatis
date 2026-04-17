import type { ServerAdapterModule } from "./types.js";
import { getAdapterSessionManagement } from "@ciutatis/adapter-utils";
import {
  execute as claudeExecute,
  getQuotaWindows as claudeGetQuotaWindows,
  sessionCodec as claudeSessionCodec,
  testEnvironment as claudeTestEnvironment,
} from "@ciutatis/adapter-claude-local/server";
import {
  agentConfigurationDoc as claudeAgentConfigurationDoc,
  models as claudeModels,
} from "@ciutatis/adapter-claude-local";
import {
  execute as cloudflareWorkersAiExecute,
  testEnvironment as cloudflareWorkersAiTestEnvironment,
} from "@ciutatis/adapter-cloudflare-workers-ai/server";
import {
  agentConfigurationDoc as cloudflareWorkersAiAgentConfigurationDoc,
  models as cloudflareWorkersAiModels,
} from "@ciutatis/adapter-cloudflare-workers-ai";
import {
  execute as codexExecute,
  getQuotaWindows as codexGetQuotaWindows,
  sessionCodec as codexSessionCodec,
  testEnvironment as codexTestEnvironment,
} from "@ciutatis/adapter-codex-local/server";
import {
  agentConfigurationDoc as codexAgentConfigurationDoc,
  models as codexModels,
} from "@ciutatis/adapter-codex-local";
import {
  execute as cursorExecute,
  sessionCodec as cursorSessionCodec,
  testEnvironment as cursorTestEnvironment,
} from "@ciutatis/adapter-cursor-local/server";
import {
  agentConfigurationDoc as cursorAgentConfigurationDoc,
  models as cursorModels,
} from "@ciutatis/adapter-cursor-local";
import {
  execute as geminiExecute,
  testEnvironment as geminiTestEnvironment,
  sessionCodec as geminiSessionCodec,
} from "@ciutatis/adapter-gemini-local/server";
import { agentConfigurationDoc as geminiAgentConfigurationDoc, models as geminiModels } from "@ciutatis/adapter-gemini-local";
import {
  execute as openClawGatewayExecute,
  testEnvironment as openClawGatewayTestEnvironment,
} from "@ciutatis/adapter-openclaw-gateway/server";
import {
  agentConfigurationDoc as openClawGatewayAgentConfigurationDoc,
  models as openClawGatewayModels,
} from "@ciutatis/adapter-openclaw-gateway";
import {
  execute as openCodeExecute,
  listOpenCodeModels,
  sessionCodec as openCodeSessionCodec,
  testEnvironment as openCodeTestEnvironment,
} from "@ciutatis/adapter-opencode-local/server";
import {
  agentConfigurationDoc as openCodeAgentConfigurationDoc,
  models as openCodeModels,
} from "@ciutatis/adapter-opencode-local";
import { processAdapter } from "./process/index.js";
import { httpAdapter } from "./http/index.js";

const localRuntimeCapabilities = {
  supportsInstructionsBundle: true,
  instructionsPathKey: "instructionsFilePath",
  requiresMaterializedRuntimeSkills: true,
  supportsPromptTemplate: true,
  supportsEnvironmentBindings: true,
  supportsModelSelection: true,
  supportsCommandConfig: true,
  supportsWorkingDirectory: true,
} as const;

const hostedWorkersAiCapabilities = {
  supportsInstructionsBundle: true,
  instructionsPathKey: "instructionsFilePath",
  supportsPromptTemplate: true,
  supportsEnvironmentBindings: true,
  supportsModelSelection: true,
  supportsHostedModelConfig: true,
} as const;

const claudeLocalAdapter: ServerAdapterModule = {
  type: "claude_local",
  execute: claudeExecute,
  testEnvironment: claudeTestEnvironment,
  sessionCodec: claudeSessionCodec,
  sessionManagement: getAdapterSessionManagement("claude_local") ?? undefined,
  models: claudeModels,
  supportsLocalAgentJwt: true,
  capabilities: localRuntimeCapabilities,
  agentConfigurationDoc: claudeAgentConfigurationDoc,
  getQuotaWindows: claudeGetQuotaWindows,
};

const cloudflareWorkersAiAdapter: ServerAdapterModule = {
  type: "cloudflare_workers_ai",
  execute: cloudflareWorkersAiExecute,
  testEnvironment: cloudflareWorkersAiTestEnvironment,
  models: cloudflareWorkersAiModels,
  capabilities: hostedWorkersAiCapabilities,
  agentConfigurationDoc: cloudflareWorkersAiAgentConfigurationDoc,
};

const codexLocalAdapter: ServerAdapterModule = {
  type: "codex_local",
  execute: codexExecute,
  testEnvironment: codexTestEnvironment,
  sessionCodec: codexSessionCodec,
  sessionManagement: getAdapterSessionManagement("codex_local") ?? undefined,
  models: codexModels,
  supportsLocalAgentJwt: true,
  capabilities: localRuntimeCapabilities,
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
  supportsLocalAgentJwt: true,
  capabilities: localRuntimeCapabilities,
  agentConfigurationDoc: cursorAgentConfigurationDoc,
};

const geminiLocalAdapter: ServerAdapterModule = {
  type: "gemini_local",
  execute: geminiExecute,
  testEnvironment: geminiTestEnvironment,
  sessionCodec: geminiSessionCodec,
  sessionManagement: getAdapterSessionManagement("gemini_local") ?? undefined,
  models: geminiModels,
  supportsLocalAgentJwt: true,
  capabilities: localRuntimeCapabilities,
  agentConfigurationDoc: geminiAgentConfigurationDoc,
};

const openClawGatewayAdapter: ServerAdapterModule = {
  type: "openclaw_gateway",
  execute: openClawGatewayExecute,
  testEnvironment: openClawGatewayTestEnvironment,
  models: openClawGatewayModels,
  agentConfigurationDoc: openClawGatewayAgentConfigurationDoc,
};

const openCodeLocalAdapter: ServerAdapterModule = {
  type: "opencode_local",
  execute: openCodeExecute,
  testEnvironment: openCodeTestEnvironment,
  sessionCodec: openCodeSessionCodec,
  sessionManagement: getAdapterSessionManagement("opencode_local") ?? undefined,
  models: openCodeModels,
  listModels: listOpenCodeModels,
  supportsLocalAgentJwt: true,
  capabilities: localRuntimeCapabilities,
  agentConfigurationDoc: openCodeAgentConfigurationDoc,
};

const adaptersByType = new Map<string, ServerAdapterModule>(
  [
    claudeLocalAdapter,
    cloudflareWorkersAiAdapter,
    codexLocalAdapter,
    cursorLocalAdapter,
    geminiLocalAdapter,
    openClawGatewayAdapter,
    openCodeLocalAdapter,
    processAdapter,
    httpAdapter,
  ].map((a) => [a.type, a]),
);

function buildUnsupportedAdapter(type: string): ServerAdapterModule {
  return {
    type,
    async execute() {
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorCode: "adapter_unsupported",
        errorMessage: `Unsupported adapter type: ${type}`,
        summary: `Unsupported adapter type: ${type}`,
      };
    },
    async testEnvironment() {
      return {
        adapterType: type,
        status: "fail",
        checks: [
          {
            code: "adapter_unsupported",
            level: "error",
            message: `Unsupported adapter type: ${type}`,
            hint: "Choose a registered adapter type or install runtime support for this adapter.",
          },
        ],
        testedAt: new Date().toISOString(),
      };
    },
    agentConfigurationDoc: `# ${type}\n\nThis adapter type is not registered on the current server runtime.`,
  };
}

export function getServerAdapter(type: string): ServerAdapterModule {
  return adaptersByType.get(type) ?? buildUnsupportedAdapter(type);
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
