/**
 * Seed Runner — Minimal Cloudflare Worker that runs the Ciutatis seed.
 *
 * Usage:
 *   # From packages/db-cloudflare:
 *   pnpm seed:remote          # starts worker against remote D1
 *   # Then in another terminal:
 *   curl http://localhost:8787
 *
 * The response JSON contains the seeded company, agents, goals, projects,
 * and — critically — the **plain-text API keys** which are only available
 * at seed time (they are stored hashed in D1).
 *
 * ⚠️  Save the API keys immediately. They cannot be recovered after this.
 */

import { seedAll } from "./seed.js";

interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/" && url.pathname !== "/seed") {
      return new Response("Not found", { status: 404 });
    }

    try {
      console.log("[seed-runner] Starting seed…");
      const result = await seedAll(env.DB);
      console.log("[seed-runner] Seed complete.");

      const output = {
        ok: true,
        timestamp: new Date().toISOString(),
        company: {
          id: result.company.id,
          name: result.company.name,
          issuePrefix: result.company.issuePrefix,
          status: result.company.status,
        },
        agents: {
          ceo: { id: result.ceo.id, name: result.ceo.name, role: result.ceo.role },
          engineeringLead: {
            id: result.engineeringLead.id,
            name: result.engineeringLead.name,
            role: result.engineeringLead.role,
          },
          qa: { id: result.qa.id, name: result.qa.name, role: result.qa.role },
        },
        apiKeys: result.apiKeys,
        goals: {
          shipV1: { id: result.goals.shipV1.id, title: result.goals.shipV1.title },
          civicTemplates: {
            id: result.goals.civicTemplates.id,
            title: result.goals.civicTemplates.title,
          },
        },
        projects: {
          platformCore: {
            id: result.projects.platformCore.id,
            name: result.projects.platformCore.name,
          },
          landingPage: {
            id: result.projects.landingPage.id,
            name: result.projects.landingPage.name,
          },
        },
      };

      return new Response(JSON.stringify(output, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("[seed-runner] Seed failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ ok: false, error: message }, null, 2), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
