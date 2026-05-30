import { headers } from "next/headers";

// Server-side mirror of apps/ui's authApi.getSession. The unified Next app does
// not own auth — it forwards the request cookies to the Ciutatis API's
// better-auth `get-session` endpoint and normalizes the result.

export type AuthSession = {
  session: { id: string; userId: string };
  user: { id: string; email: string | null; name: string | null; isInstanceAdmin?: boolean };
};

export function apiBase(): string {
  return (
    process.env.API_INTERNAL_BASE ??
    process.env.NEXT_PUBLIC_API_BASE ??
    "http://localhost:3100"
  );
}

function normalizeSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const sessionValue = record.session;
  const userValue = record.user;
  if (!sessionValue || typeof sessionValue !== "object") return null;
  if (!userValue || typeof userValue !== "object") return null;
  const session = sessionValue as Record<string, unknown>;
  const user = userValue as Record<string, unknown>;
  if (typeof session.id !== "string" || typeof session.userId !== "string") return null;
  if (typeof user.id !== "string") return null;
  return {
    session: { id: session.id, userId: session.userId },
    user: {
      id: user.id,
      email: typeof user.email === "string" ? user.email : null,
      name: typeof user.name === "string" ? user.name : null,
      isInstanceAdmin:
        typeof user.isInstanceAdmin === "boolean" ? user.isInstanceAdmin : undefined,
    },
  };
}

export async function getServerSession(): Promise<AuthSession | null> {
  const cookie = (await headers()).get("cookie") ?? "";
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/auth/get-session`, {
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  const direct = normalizeSession(payload);
  if (direct) return direct;
  return payload && typeof payload === "object"
    ? normalizeSession((payload as Record<string, unknown>).data)
    : null;
}
