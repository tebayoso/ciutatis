import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { agentConfigurationDoc } from "@ciutatis/adapter-cloudflare-workers-ai";
import type { AppEnv } from "../lib/types.js";
import { llmRoutes } from "./llms.js";

function createApp() {
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("actor", {
      type: "board",
      userId: "user_1",
      isInstanceAdmin: true,
      source: "local_implicit",
    });
    await next();
  });
  app.route("/", llmRoutes());
  return app;
}

describe("workers llm routes", () => {
  it("lists the hosted adapter in the worker index", async () => {
    const app = createApp();
    const res = await app.fetch(
      new Request("https://example.com/llms/agent-configuration.txt"),
      {} as never,
      {} as never,
    );

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("cloudflare_workers_ai");
    expect(text).toContain("/llms/agent-configuration/cloudflare_workers_ai.txt");
  });

  it("returns the Cloudflare adapter configuration doc", async () => {
    const app = createApp();
    const res = await app.fetch(
      new Request("https://example.com/llms/agent-configuration/cloudflare_workers_ai.txt"),
      {} as never,
      {} as never,
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(agentConfigurationDoc);
  });
});
