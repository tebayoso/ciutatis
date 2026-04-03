import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { issues, institutions, agents } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { badRequest } from "../lib/errors.js";
import { logActivity } from "../lib/activity.js";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function contactRoutes() {
  const app = new Hono<AppEnv>();

  app.post("/contact", async (c) => {
    const db = c.get("db");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw badRequest("Invalid JSON body");
    }

    const { name, email, message } = body as Record<string, unknown>;

    const errors: string[] = [];
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.push("name is required");
    }
    if (!email || typeof email !== "string" || email.trim().length === 0) {
      errors.push("email is required");
    } else if (!isValidEmail(email as string)) {
      errors.push("email format is invalid");
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      errors.push("message is required");
    }
    if (errors.length > 0) {
      return c.json({ error: "Validation failed", details: errors }, 400);
    }

    const trimmedName = (name as string).trim();
    const trimmedEmail = (email as string).trim();
    const trimmedMessage = (message as string).trim();

    const company = await db
      .select()
      .from(institutions)
      .where(eq(institutions.status, "active"))
      .limit(1)
      .then((r: any[]) => r[0] ?? null);

    if (!company) {
      return c.json({ error: "No active institution found to receive contact requests" }, 503);
    }

    const supportAgent = await db
      .select()
      .from(agents)
      .where(eq(agents.companyId, company.id))
      .then((rows: any[]) =>
        rows.find(
          (a: any) =>
            a.status !== "terminated" &&
            (a.role?.toLowerCase().includes("support") ||
              a.name?.toLowerCase().includes("support") ||
              a.title?.toLowerCase().includes("support")),
        ) ?? null,
      );

    const issueCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(eq(issues.companyId, company.id))
      .then((r) => r[0]?.count ?? 0);
    const issueNumber = Number(issueCount) + 1;
    const prefix = company.issuePrefix ?? "ISS";
    const identifier = `${prefix}-${issueNumber}`;

    const title = `Contact Form: ${trimmedName}`;
    const description = [
      `**From:** ${trimmedName}`,
      `**Email:** ${trimmedEmail}`,
      "",
      "---",
      "",
      trimmedMessage,
    ].join("\n");

    await db.insert(issues).values({
      companyId: company.id,
      title,
      description,
      status: "backlog",
      priority: "medium",
      assigneeAgentId: supportAgent?.id ?? null,
      issueNumber,
      identifier,
      requestDepth: 0,
    });

    const created = await db
      .select()
      .from(issues)
      .where(eq(issues.identifier, identifier))
      .then((r: any[]) => r[0] ?? null);

    await logActivity(db, {
      companyId: company.id,
      actorType: "system",
      actorId: "contact-form",
      agentId: null,
      runId: null,
      action: "issue.created",
      entityType: "issue",
      entityId: created?.id ?? "",
      details: {
        source: "contact_form",
        contactName: trimmedName,
        contactEmail: trimmedEmail,
        identifier,
      },
    });

    return c.json({
      success: true,
      message: "Thank you! We'll get back to you soon.",
      ticketId: identifier,
    });
  });

  return app;
}
