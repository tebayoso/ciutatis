import { Hono } from "hono";
import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { agentConfigurationDoc } from "@ciutatis/adapter-cloudflare-workers-ai";
import { agents } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { forbidden } from "../lib/errors.js";

function hasCreatePermission(
  agent: { role: string; permissions: unknown },
): boolean {
  if (!agent.permissions || typeof agent.permissions !== "object") return false;
  return Boolean(
    (agent.permissions as Record<string, unknown>).canCreateAgents,
  );
}

async function assertCanRead(c: Context<AppEnv>) {
  const actor = c.get("actor");
  if (actor.type === "board") return;
  if (actor.type !== "agent" || !actor.agentId) {
    throw forbidden("Board or permitted agent authentication required");
  }
  const db = c.get("db");
  const [actorAgent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, actor.agentId));
  if (!actorAgent || !hasCreatePermission(actorAgent)) {
    throw forbidden("Missing permission to read agent configuration reflection");
  }
}

function normalizeAdapterTypeSegment(value: string) {
  return value.endsWith(".txt") ? value.slice(0, -4) : value;
}

export function llmRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/llms/agent-configuration.txt", async (c) => {
    await assertCanRead(c);
    const lines = [
      "# Ciutatis Agent Configuration Index (Workers)",
      "",
      "Hosted adapters available in this deployment:",
      "- cloudflare_workers_ai",
      "",
      "Adapter configuration docs:",
      "- GET /llms/agent-configuration/cloudflare_workers_ai.txt",
      "",
      "Agent identity references:",
      "- GET /llms/agent-icons.txt",
      "",
      "Local CLI adapters are not available in the Workers deployment.",
    ];
    return c.text(lines.join("\n"));
  });

  app.get("/llms/agent-icons.txt", async (c) => {
    await assertCanRead(c);
    const lines = [
      "# Ciutatis Agent Icon Names",
      "",
      "Set the `icon` field on hire/create payloads to one of the available icons.",
      "Refer to @paperclipai/shared AGENT_ICON_NAMES for the full list.",
      "",
    ];
    return c.text(lines.join("\n"));
  });

  app.get("/llms/agent-configuration/cloudflare_workers_ai.txt", async (c) => {
    await assertCanRead(c);
    return c.text(agentConfigurationDoc);
  });

  app.get("/llms/agent-configuration/:adapterType", async (c) => {
    await assertCanRead(c);
    const adapterType = normalizeAdapterTypeSegment(c.req.param("adapterType"));
    if (adapterType === "cloudflare_workers_ai") {
      return c.text(agentConfigurationDoc);
    }
    return c.text(
      `# ${adapterType} agent configuration\n\nLocal adapters are not available in the Workers deployment.\nUse the main server for adapter-specific configuration.`,
      404,
    );
  });

  return app;
}
