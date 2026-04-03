import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { authUsers, authAccounts, authSessions } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { verifyPassword, generateRandomString } from "better-auth/crypto";
import { serializeAuthCookie } from "../auth/cookies.js";
import { setSessionInKV } from "../session/kv.js";

const SESSION_TTL_SECONDS = 86_400;

export function authRoutes() {
  const app = new Hono<AppEnv>();

  app.post("/sign-in/email", async (c) => {
    const db = c.get("db");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { email, password } = body as Record<string, unknown>;

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const trimmedEmail = email.trim().toLowerCase();

    const user = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, trimmedEmail))
      .then((rows: any[]) => rows[0] ?? null);

    if (!user) {
      return c.json({ error: "Invalid email or password" }, 400);
    }

    const account = await db
      .select()
      .from(authAccounts)
      .where(and(eq(authAccounts.userId, user.id), eq(authAccounts.providerId, "credential")))
      .then((rows: any[]) => rows[0] ?? null);

    if (!account?.password) {
      return c.json({ error: "Invalid email or password" }, 400);
    }

    let isValid: boolean;
    try {
      isValid = await verifyPassword({ hash: account.password, password });
    } catch {
      return c.json({ error: "Invalid email or password" }, 400);
    }

    if (!isValid) {
      return c.json({ error: "Invalid email or password" }, 400);
    }

    const sessionId = crypto.randomUUID();
    const sessionToken = generateRandomString(32, "a-z", "A-Z", "0-9");
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1_000).toISOString();

    try {
      await db.insert(authSessions).values({
        id: sessionId,
        token: sessionToken,
        userId: user.id,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });

      await setSessionInKV(sessionId, { userId: user.id }, SESSION_TTL_SECONDS);
    } catch {
      return c.json({ error: "Failed to create session" }, 500);
    }

    const cookieHeader = serializeAuthCookie(c, sessionToken);
    c.header("set-cookie", cookieHeader);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      session: {
        id: sessionId,
        expiresAt,
      },
    });
  });

  return app;
}
