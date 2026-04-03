import { hmacSha256, timingSafeEqual, base64UrlEncodeString, base64UrlDecodeString } from "./crypto.js";

/**
 * Local agent JWT claims structure.
 * Matches server/src/agent-auth-jwt.ts.
 */
export interface LocalAgentJwtClaims {
  sub: string;
  company_id: string;
  adapter_type: string;
  run_id: string;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
  jti?: string;
}

const JWT_ALGORITHM = "HS256";

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

interface JwtConfig {
  secret: string;
  ttlSeconds: number;
  issuer: string;
  audience: string;
}

function jwtConfigFromEnv(env: {
  PAPERCLIP_AGENT_JWT_SECRET?: string;
  PAPERCLIP_AGENT_JWT_TTL_SECONDS?: string;
  PAPERCLIP_AGENT_JWT_ISSUER?: string;
  PAPERCLIP_AGENT_JWT_AUDIENCE?: string;
}): JwtConfig | null {
  const secret = env.PAPERCLIP_AGENT_JWT_SECRET;
  if (!secret) return null;

  return {
    secret,
    ttlSeconds: parseNumber(env.PAPERCLIP_AGENT_JWT_TTL_SECONDS, 60 * 60 * 48),
    issuer: env.PAPERCLIP_AGENT_JWT_ISSUER ?? "paperclip",
    audience: env.PAPERCLIP_AGENT_JWT_AUDIENCE ?? "paperclip-api",
  };
}

/**
 * Verify a local agent JWT token. Uses Web Crypto API.
 * Returns claims if valid, null otherwise.
 */
export async function verifyLocalAgentJwt(
  token: string,
  env: {
    PAPERCLIP_AGENT_JWT_SECRET?: string;
    PAPERCLIP_AGENT_JWT_TTL_SECONDS?: string;
    PAPERCLIP_AGENT_JWT_ISSUER?: string;
    PAPERCLIP_AGENT_JWT_AUDIENCE?: string;
  },
): Promise<LocalAgentJwtClaims | null> {
  if (!token) return null;
  const config = jwtConfigFromEnv(env);
  if (!config) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, claimsB64, signature] = parts;

  const header = parseJson(base64UrlDecodeString(headerB64));
  if (!header || header.alg !== JWT_ALGORITHM) return null;

  const signingInput = `${headerB64}.${claimsB64}`;
  const expectedSig = await hmacSha256(config.secret, signingInput);
  if (!timingSafeEqual(signature, expectedSig)) return null;

  const claims = parseJson(base64UrlDecodeString(claimsB64));
  if (!claims) return null;

  const sub = typeof claims.sub === "string" ? claims.sub : null;
  const companyId = typeof claims.company_id === "string" ? claims.company_id : null;
  const adapterType = typeof claims.adapter_type === "string" ? claims.adapter_type : null;
  const runId = typeof claims.run_id === "string" ? claims.run_id : null;
  const iat = typeof claims.iat === "number" ? claims.iat : null;
  const exp = typeof claims.exp === "number" ? claims.exp : null;
  if (!sub || !companyId || !adapterType || !runId || !iat || !exp) return null;

  const now = Math.floor(Date.now() / 1000);
  if (exp < now) return null;

  const issuer = typeof claims.iss === "string" ? claims.iss : undefined;
  const audience = typeof claims.aud === "string" ? claims.aud : undefined;
  if (issuer && issuer !== config.issuer) return null;
  if (audience && audience !== config.audience) return null;

  return {
    sub,
    company_id: companyId,
    adapter_type: adapterType,
    run_id: runId,
    iat,
    exp,
    ...(issuer ? { iss: issuer } : {}),
    ...(audience ? { aud: audience } : {}),
    jti: typeof claims.jti === "string" ? claims.jti : undefined,
  };
}
