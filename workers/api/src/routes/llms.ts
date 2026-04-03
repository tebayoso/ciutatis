import { Hono } from "hono";
import type { Context } from "hono";
import { eq } from "drizzle-orm";
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

export function llmRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/llms/agent-configuration.txt", async (c) => {
    await assertCanRead(c);
    const lines = [
      "# Ciutatis Agent Configuration Index (Workers)",
      "",
      "Agent adapters are managed through the main server deployment.",
      "",
      "Related API endpoints:",
      "- GET /api/companies/:companyId/agent-configurations",
      "- GET /api/agents/:id/configuration",
      "- POST /api/companies/:companyId/agent-hires",
      "",
      "Agent identity references:",
      "- GET /llms/agent-icons.txt",
      "",
    ];
    return c.text(lines.join("\n"));
  });

  app.get("/llms/agent-icons.txt", async (c) => {
    await assertCanRead(c);
    const lines = [
      "# Ciutatis Agent Icon Names",
      "",
      "Set the `icon` field on hire/create payloads to one of the available icons.",
      "Refer to @ciutatis/shared AGENT_ICON_NAMES for the full list.",
      "",
    ];
    return c.text(lines.join("\n"));
  });

  app.get("/llms/agent-configuration/:adapterType.txt", async (c) => {
    await assertCanRead(c);
    const adapterType = c.req.param("adapterType");
    return c.text(
      `# ${adapterType} agent configuration\n\nLocal adapters are not available in the Workers deployment.\nUse the main server for adapter-specific configuration.`,
      404,
    );
  });

  return app;
}
