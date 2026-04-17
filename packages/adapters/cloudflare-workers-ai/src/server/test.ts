import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import { asString } from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL } from "../index.js";
import {
  buildRunUrl,
  extractResponseText,
  normalizeEffort,
  resolveCloudflareWorkersAiEnv,
  resolveCredentials,
  summarizeError,
} from "./shared.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = { ...(ctx.config ?? {}) };
  const env = resolveCloudflareWorkersAiEnv(config.env);
  const runtimeEnv = Object.fromEntries(
    Object.entries({ ...process.env, ...env }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const credentials = resolveCredentials(config, runtimeEnv);
  const checks: AdapterEnvironmentCheck[] = [];

  if (!credentials.accountId) {
    checks.push({
      code: "cloudflare_workers_ai_account_missing",
      level: "error",
      message: "Cloudflare account ID is not configured.",
      hint: "Set CLOUDFLARE_ACCOUNT_ID or CIUTATIS_CLOUDFLARE_ACCOUNT_ID on the server.",
    });
  } else {
    checks.push({
      code: "cloudflare_workers_ai_account_present",
      level: "info",
      message: `Configured account: ${credentials.accountId}`,
    });
  }

  if (!credentials.apiToken) {
    checks.push({
      code: "cloudflare_workers_ai_token_missing",
      level: "error",
      message: "Cloudflare API token is not configured.",
      hint: "Set CLOUDFLARE_API_TOKEN or CIUTATIS_CLOUDFLARE_API_TOKEN on the server.",
    });
  } else {
    checks.push({
      code: "cloudflare_workers_ai_token_present",
      level: "info",
      message: "Cloudflare API token detected.",
    });
  }

  const model = asString(config.model, DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL).trim();
  checks.push({
    code: "cloudflare_workers_ai_model_configured",
    level: "info",
    message: `Configured model: ${model}`,
  });

  const effort = normalizeEffort(config.effort ?? config.reasoningEffort);
  if (effort) {
    checks.push({
      code: "cloudflare_workers_ai_reasoning_effort",
      level: "info",
      message: `Reasoning effort: ${effort}`,
    });
  }

  if (!credentials.accountId || !credentials.apiToken) {
    return {
      adapterType: ctx.adapterType,
      status: summarizeStatus(checks),
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(buildRunUrl(credentials.accountId, model), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${credentials.apiToken}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Respond with hello." }],
        max_tokens: 32,
        ...(effort ? { reasoning: { effort } } : {}),
      }),
    });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      checks.push({
        code: "cloudflare_workers_ai_probe_failed",
        level: "error",
        message: summarizeError(payload) ?? `Workers AI probe failed with status ${response.status}.`,
        hint: "Verify the account ID, API token permissions, and model availability.",
      });
    } else {
      const text = extractResponseText(payload);
      checks.push({
        code: "cloudflare_workers_ai_probe_ok",
        level: text ? "info" : "warn",
        message: text
          ? `Workers AI probe succeeded: ${text}`
          : "Workers AI probe succeeded but returned no text.",
      });
    }
  } catch (error) {
    checks.push({
      code: "cloudflare_workers_ai_probe_error",
      level: "error",
      message: error instanceof Error ? error.message : "Workers AI probe failed.",
      hint: "Check outbound network access to api.cloudflare.com from the Ciutatis server host.",
    });
  }

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
