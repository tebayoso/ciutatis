import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { authUsers, authAccounts, authSessions } from "@ciutatis/db-cloudflare";
import type { AppContext, AppEnv } from "../lib/types.js";
import { hashPassword, verifyPassword, generateRandomString } from "better-auth/crypto";
import { parseAuthCookie, serializeAuthCookie } from "../auth/cookies.js";
import { setSessionInKV, deleteSessionFromKV } from "../session/kv.js";

// Public, self-serve citizen accounts. Same auth/user table as the admin, but a
// distinct, ungated HTTP surface: anyone can register a citizen account here,
// whereas the operator auth surface (/api/auth) stays invite/claim-only.
// A citizen account has no company membership and no instance role, so it is
// powerless across /api beyond its own identity and public activity.

const SESSION_TTL_SECONDS = 86_400;

async function createSession(
  c: AppContext,
  user: { id: string; email: string; name: string },
) {
  const db = c.get("db");
  const sessionId = crypto.randomUUID();
  const sessionToken = generateRandomString(32, "a-z", "A-Z", "0-9");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1_000).toISOString();

  await db.insert(authSessions).values({
    id: sessionId,
    token: sessionToken,
    userId: user.id,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });
  await setSessionInKV(sessionId, { userId: user.id }, SESSION_TTL_SECONDS);

  c.header("set-cookie", serializeAuthCookie(c, sessionToken));
  return c.json({ user: { id: user.id, email: user.email, name: user.name } });
}

export function publicAuthRoutes() {
  const app = new Hono<AppEnv>();

  // Current citizen session — returns {user:null} (200) when anonymous so the
  // public UI can check login state without treating "logged out" as an error.
  app.get("/session", async (c) => {
    const actor = c.get("actor");
    if (actor.type !== "board" || !actor.userId) {
      return c.json({ user: null });
    }
    const db = c.get("db");
    const user = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, actor.userId))
      .then((rows: any[]) => rows[0] ?? null);
    if (!user) {
      return c.json({ user: null });
    }
    return c.json({ user: { id: user.id, name: user.name, email: user.email } });
  });

  app.post("/sign-up", async (c) => {
    const db = c.get("db");
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { name, email, password } = body as Record<string, unknown>;
    if (
      !name || typeof name !== "string" ||
      !email || typeof email !== "string" ||
      !password || typeof password !== "string"
    ) {
      return c.json({ error: "Name, email, and password are required" }, 400);
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) {
      return c.json({ error: "Name, email, and password are required" }, 400);
    }
    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    const existingUser = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, trimmedEmail))
      .then((rows: any[]) => rows[0] ?? null);
    if (existingUser) {
      return c.json({ error: "An account with this email already exists" }, 409);
    }

    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    try {
      const passwordHash = await hashPassword(password);
      await db.insert(authUsers).values({
        id: userId,
        name: trimmedName,
        email: trimmedEmail,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      });
      await db.insert(authAccounts).values({
        id: accountId,
        accountId: trimmedEmail,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
      return await createSession(c, { id: userId, email: trimmedEmail, name: trimmedName });
    } catch {
      return c.json({ error: "Failed to create account" }, 500);
    }
  });

  app.post("/sign-in", async (c) => {
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

    try {
      return await createSession(c, { id: user.id, email: user.email, name: user.name });
    } catch {
      return c.json({ error: "Failed to create session" }, 500);
    }
  });

  app.post("/sign-out", async (c) => {
    const db = c.get("db");
    const token = parseAuthCookie(c);
    if (token) {
      const session = await db
        .select()
        .from(authSessions)
        .where(eq(authSessions.token, token))
        .then((rows: any[]) => rows[0] ?? null);
      if (session) {
        await deleteSessionFromKV(session.id);
        await db.delete(authSessions).where(eq(authSessions.id, session.id));
      }
    }
    c.header("set-cookie", serializeAuthCookie(c, "", { maxAge: 0 }));
    return c.json({ success: true });
  });

  return app;
}
