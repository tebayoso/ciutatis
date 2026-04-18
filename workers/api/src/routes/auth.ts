import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { authUsers, authAccounts, authSessions } from "@ciutatis/db-cloudflare";
import type { AppContext, AppEnv } from "../lib/types.js";
import { hashPassword, verifyPassword, generateRandomString } from "better-auth/crypto";
import { serializeAuthCookie } from "../auth/cookies.js";
import { setSessionInKV } from "../session/kv.js";

const SESSION_TTL_SECONDS = 86_400;

export function authRoutes() {
  const app = new Hono<AppEnv>();

  async function createSession(c: AppContext, user: {
    id: string;
    email: string;
    name: string;
  }) {
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
  }

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

    try {
      return await createSession(c, {
        id: user.id,
        email: user.email,
        name: user.name,
      });
    } catch {
      return c.json({ error: "Failed to create session" }, 500);
    }
  });

  app.post("/sign-up/email", async (c) => {
    const disableSignup = c.env.AUTH_DISABLE_SIGNUP;
    if (disableSignup === "true") {
      return c.json(
        { error: "Sign up is currently disabled. Contact support for access." },
        403,
      );
    }

    const db = c.get("db");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { name, email, password } = body as Record<string, unknown>;
    if (
      !name ||
      typeof name !== "string" ||
      !email ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return c.json({ error: "Name, email, and password are required" }, 400);
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) {
      return c.json({ error: "Name, email, and password are required" }, 400);
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
      return await createSession(c, {
        id: userId,
        email: trimmedEmail,
        name: trimmedName,
      });
    } catch {
      return c.json({ error: "Failed to create account" }, 500);
    }
  });

  return app;
}
