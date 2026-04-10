import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL,
  models as cloudflareWorkersAiModels,
} from "@ciutatis/adapter-cloudflare-workers-ai";
import {
  execute,
  testEnvironment,
} from "@ciutatis/adapter-cloudflare-workers-ai/server";
import { listAdapterModels } from "../adapters/index.js";

describe("cloudflare_workers_ai adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
  });

  it("is listed by the server adapter registry", async () => {
    const models = await listAdapterModels("cloudflare_workers_ai");
    expect(models).toEqual(cloudflareWorkersAiModels);
  });

  it("reports missing credentials in environment diagnostics", async () => {
    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "cloudflare_workers_ai",
      config: {},
    });

    expect(result.status).toBe("fail");
    expect(
      result.checks.some((check) => check.code === "cloudflare_workers_ai_account_missing"),
    ).toBe(true);
    expect(
      result.checks.some((check) => check.code === "cloudflare_workers_ai_token_missing"),
    ).toBe(true);
  });

  it("runs a Workers AI response request and records usage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            result: {
              choices: [
                {
                  finish_reason: "stop",
                  message: {
                    role: "assistant",
                    content: "hello from workers ai",
                  },
                },
              ],
              usage: {
                prompt_tokens: 11,
                completion_tokens: 7,
                total_tokens: 18,
                prompt_tokens_details: {
                  cached_tokens: 0,
                },
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const logs: string[] = [];
    const result = await execute({
      runId: "run-1",
      agent: {
        id: "agent-1",
        companyId: "company-1",
        name: "CEO",
        adapterType: "cloudflare_workers_ai",
        adapterConfig: {},
      },
      runtime: {
        sessionId: null,
        sessionParams: null,
        sessionDisplayId: null,
        taskKey: null,
      },
      config: {
        env: {
          CLOUDFLARE_ACCOUNT_ID: "acct_123",
          CLOUDFLARE_API_TOKEN: "token_123",
        },
      },
      context: {},
      onLog: async (_stream, chunk) => {
        logs.push(chunk);
      },
    });

    expect(result.timedOut).toBe(false);
    expect(result.errorMessage).toBeFalsy();
    expect(result.model).toBe(DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL);
    expect(result.provider).toBe("cloudflare");
    expect(result.usage).toEqual({
      inputTokens: 11,
      outputTokens: 7,
    });
    expect(logs.some((entry) => entry.includes("hello from workers ai"))).toBe(true);
  });
});
