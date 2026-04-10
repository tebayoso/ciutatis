import { DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL } from "@ciutatis/adapter-cloudflare-workers-ai";
import type { CiutatisConfig } from "../config/schema.js";
import type { CheckResult } from "./index.js";

export async function llmCheck(config: CiutatisConfig): Promise<CheckResult> {
  if (!config.llm) {
    return {
      name: "LLM provider",
      status: "pass",
      message: "No LLM provider configured (optional)",
    };
  }

  if (!config.llm.apiKey) {
    return {
      name: "LLM provider",
      status: "pass",
      message: `${config.llm.provider} configured but no API key set (optional)`,
    };
  }

  try {
    if (config.llm.provider === "cloudflare_workers_ai") {
      if (!config.llm.accountId) {
        return {
          name: "LLM provider",
          status: "fail",
          message: "Cloudflare Workers AI requires an account ID",
          canRepair: false,
          repairHint: "Run `ciutatis configure --section llm`",
        };
      }
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.llm.accountId)}/ai/run/${DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.llm.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Respond with hello." }],
            max_tokens: 16,
          }),
        },
      );
      if (res.ok) {
        return {
          name: "LLM provider",
          status: "pass",
          message: "Cloudflare Workers AI credentials are valid",
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          name: "LLM provider",
          status: "fail",
          message: `Cloudflare Workers AI credentials are invalid (${res.status})`,
          canRepair: false,
          repairHint: "Run `ciutatis configure --section llm`",
        };
      }
      return {
        name: "LLM provider",
        status: "warn",
        message: `Cloudflare Workers AI returned status ${res.status}`,
      };
    }

    if (config.llm.provider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": config.llm.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (res.ok || res.status === 400) {
        return { name: "LLM provider", status: "pass", message: "Claude API key is valid" };
      }
      if (res.status === 401) {
        return {
          name: "LLM provider",
          status: "fail",
          message: "Claude API key is invalid (401)",
          canRepair: false,
          repairHint: "Run `ciutatis configure --section llm`",
        };
      }
      return {
        name: "LLM provider",
        status: "warn",
        message: `Claude API returned status ${res.status}`,
      };
    } else {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${config.llm.apiKey}` },
      });
      if (res.ok) {
        return { name: "LLM provider", status: "pass", message: "OpenAI API key is valid" };
      }
      if (res.status === 401) {
        return {
          name: "LLM provider",
          status: "fail",
          message: "OpenAI API key is invalid (401)",
          canRepair: false,
          repairHint: "Run `ciutatis configure --section llm`",
        };
      }
      return {
        name: "LLM provider",
        status: "warn",
        message: `OpenAI API returned status ${res.status}`,
      };
    }
  } catch {
    return {
      name: "LLM provider",
      status: "warn",
      message: "Could not reach API to validate key",
    };
  }
}
