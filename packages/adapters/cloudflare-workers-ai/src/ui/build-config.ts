import type { CreateConfigValues } from "@ciutatis/adapter-utils";
import { DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL } from "../index.js";

export function buildCloudflareWorkersAiConfig(
  values: CreateConfigValues,
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    model: values.model || DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL,
    timeoutSec: 120,
  };

  if (values.instructionsFilePath?.trim()) {
    config.instructionsFilePath = values.instructionsFilePath.trim();
  }
  if (values.promptTemplate.trim()) {
    config.promptTemplate = values.promptTemplate.trim();
  }
  if (values.thinkingEffort.trim()) {
    config.effort = values.thinkingEffort.trim();
  }
  if (values.envBindings && Object.keys(values.envBindings).length > 0) {
    config.env = values.envBindings;
  }

  return config;
}
