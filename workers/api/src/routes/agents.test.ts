import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { models as cloudflareWorkersAiModels } from "@ciutatis/adapter-cloudflare-workers-ai";
import { agents } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { enqueueHostedHeartbeatRun } from "../lib/hosted-heartbeats.js";
import { errorHandler } from "../middleware/error-handler.js";
import { agentRoutes } from "./agents.js";

vi.mock("../lib/hosted-heartbeats.js", () => ({
  enqueueHostedHeartbeatRun: vi.fn(),
  readInlineHeartbeatRunLog: vi.fn(),
}));

vi.mock("../lib/activity.js", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

function createFakeDb(agent: Record<string, unknown> | null = {
  id: "agent_1",
  companyId: "company_1",
  name: "Agent One",
  adapterType: "cloudflare_workers_ai",
}) {
  return {
    select() {
      return {
        from(table: unknown) {
          return {
            where() {
              if (table === agents && agent) {
                return Promise.resolve([agent]);
              }
              return Promise.resolve([]);
            },
          };
        },
      };
    },
  };
}

function createApp(
  actor: Record<string, unknown> = {
    type: "board",
    userId: "user_1",
    isInstanceAdmin: true,
    source: "local_implicit",
  },
  db = createFakeDb(),
) {
  const app = new Hono<AppEnv>();
  app.onError(errorHandler);
  app.use("*", async (c, next) => {
    c.set("actor", actor as unknown as AppEnv["Variables"]["actor"]);
    c.set("db", db as unknown as AppEnv["Variables"]["db"]);
    await next();
  });
  app.route("/", agentRoutes());
  return app;
}

describe("workers agent adapter routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns hosted Workers AI models", async () => {
    const app = createApp();
    const res = await app.fetch(
      new Request("https://example.com/companies/company_1/adapters/cloudflare_workers_ai/models"),
      {} as never,
      {} as never,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(cloudflareWorkersAiModels);
  });

  it("runs a hosted Workers AI environment probe", async () => {
    const app = createApp();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            choices: [{ message: { content: "hello from kimi" } }],
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await app.fetch(
      new Request("https://example.com/companies/company_1/adapters/cloudflare_workers_ai/test-environment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adapterConfig: {} }),
      }),
      {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_API_TOKEN: "token_123",
      } as never,
      {} as never,
    );

    expect(res.status).toBe(200);
    const payload = await res.json() as {
      status: string;
      checks: Array<{ code: string }>;
    };
    expect(payload.status).toBe("pass");
    expect(payload.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "cloudflare_workers_ai_probe_ok" }),
      ]),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/ai/run/@cf/moonshotai/kimi-k2.5"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns a queued hosted run from /agents/:id/heartbeat/invoke", async () => {
    vi.mocked(enqueueHostedHeartbeatRun).mockResolvedValue({
      id: "run_1",
      companyId: "company_1",
      agentId: "agent_1",
      status: "queued",
    } as never);
    const app = createApp();
    const waitUntil = vi.fn();

    const res = await app.fetch(
      new Request("https://example.com/agents/agent_1/heartbeat/invoke", {
        method: "POST",
      }),
      {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_API_TOKEN: "token_123",
      } as never,
      { waitUntil } as never,
    );

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        id: "run_1",
        agentId: "agent_1",
        status: "queued",
      }),
    );
    expect(enqueueHostedHeartbeatRun).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent_1",
        source: "on_demand",
        triggerDetail: "manual",
      }),
    );
  });

  it("blocks an agent from invoking another agent in the worker runtime", async () => {
    const app = createApp(
      {
        type: "agent",
        agentId: "agent_2",
        companyId: "company_1",
        source: "agent_key",
      },
      createFakeDb(),
    );

    const res = await app.fetch(
      new Request("https://example.com/agents/agent_1/heartbeat/invoke", {
        method: "POST",
      }),
      {} as never,
      { waitUntil: vi.fn() } as never,
    );

    expect(res.status).toBe(403);
    expect(enqueueHostedHeartbeatRun).not.toHaveBeenCalled();
  });
});
