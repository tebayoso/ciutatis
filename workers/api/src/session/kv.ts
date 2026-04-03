const DEFAULT_SESSION_TTL_SECONDS = 86_400;

let sessionNamespace: KVNamespace | null = null;

export interface SessionData {
  userId?: string;
  [key: string]: unknown;
}

export function configureSessionKV(namespace: KVNamespace): void {
  sessionNamespace = namespace;
}

function getSessionNamespace(): KVNamespace {
  if (!sessionNamespace) {
    throw new Error("CIUTATIS_SESSIONS KV namespace is not configured");
  }

  return sessionNamespace;
}

export async function getSessionFromKV(sessionId: string): Promise<SessionData | null> {
  const raw = await getSessionNamespace().get(sessionId);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export async function setSessionInKV(
  sessionId: string,
  data: SessionData,
  ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS,
): Promise<void> {
  await getSessionNamespace().put(sessionId, JSON.stringify(data), {
    expirationTtl: Math.max(1, Math.floor(ttlSeconds)),
  });
}

export async function deleteSessionFromKV(sessionId: string): Promise<void> {
  await getSessionNamespace().delete(sessionId);
}
