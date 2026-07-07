import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { authUsers, publicRequests, publicContributions } from "@ciutatis/db-cloudflare";
import type { AppContext, AppEnv } from "../lib/types.js";

// Citizen self-service: a signed-in user's own identity and public activity.
// Board-only (any authenticated session); company membership is not required.

function requireCitizen(c: AppContext): string | null {
  const actor = c.get("actor");
  if (actor.type !== "board" || !actor.userId) return null;
  return actor.userId;
}

export function meRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/", async (c) => {
    const userId = requireCitizen(c);
    if (!userId) return c.json({ error: "Not signed in" }, 401);
    const user = await c
      .get("db")
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, userId))
      .then((rows: any[]) => rows[0] ?? null);
    if (!user) return c.json({ error: "Not signed in" }, 401);
    return c.json({ id: user.id, name: user.name, email: user.email });
  });

  app.get("/requests", async (c) => {
    const userId = requireCitizen(c);
    if (!userId) return c.json({ error: "Not signed in" }, 401);
    const rows = await c
      .get("db")
      .select({
        publicId: publicRequests.publicId,
        institutionSlug: publicRequests.institutionSlug,
        category: publicRequests.category,
        title: publicRequests.publicTitle,
        status: publicRequests.publicStatus,
        createdAt: publicRequests.createdAt,
      })
      .from(publicRequests)
      .where(eq(publicRequests.ownerUserId, userId))
      .orderBy(desc(publicRequests.createdAt));
    return c.json(rows);
  });

  app.get("/contributions", async (c) => {
    const userId = requireCitizen(c);
    if (!userId) return c.json({ error: "Not signed in" }, 401);
    const rows = await c
      .get("db")
      .select({
        filename: publicContributions.filename,
        status: publicContributions.status,
        documentId: publicContributions.documentId,
        classificationLabel: publicContributions.classificationLabel,
        createdAt: publicContributions.createdAt,
      })
      .from(publicContributions)
      .where(eq(publicContributions.userId, userId))
      .orderBy(desc(publicContributions.createdAt));
    return c.json(rows);
  });

  return app;
}
