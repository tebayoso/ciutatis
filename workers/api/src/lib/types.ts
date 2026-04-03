import type { Context } from "hono";

/**
 * Env bindings for the Cloudflare Worker.
 * Matches the bindings defined in wrangler.toml.
 */
export interface Env {
  // D1 Database
  DB: D1Database;
  // R2 Bucket for asset storage
  ASSETS: R2Bucket;
  // KV Namespace for caching/sessions
  CIUTATIS_SESSIONS: KVNamespace;
  // Secrets (set via wrangler secret)
  BETTER_AUTH_SECRET: string;
  PAPERCLIP_AGENT_JWT_SECRET?: string;
  PAPERCLIP_AGENT_JWT_TTL_SECONDS?: string;
  PAPERCLIP_AGENT_JWT_ISSUER?: string;
  PAPERCLIP_AGENT_JWT_AUDIENCE?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  // Deployment configuration
  DEPLOYMENT_MODE?: string;
  DEPLOYMENT_EXPOSURE?: string;
  // Auth configuration
  AUTH_DISABLE_SIGNUP?: string;
}

/**
 * Actor types matching the Express server's actor system.
 * Board = human operator, Agent = AI agent with API key, None = unauthenticated.
 */
export type ActorSource = "local_implicit" | "session" | "agent_key" | "agent_jwt" | "none";

export interface BoardActor {
  type: "board";
  userId: string;
  companyIds?: string[];
  isInstanceAdmin: boolean;
  runId?: string;
  source: ActorSource;
}

export interface AgentActor {
  type: "agent";
  agentId: string;
  companyId: string;
  keyId?: string;
  runId?: string;
  source: ActorSource;
}

export interface NoneActor {
  type: "none";
  runId?: string;
  source: "none";
}

export type Actor = BoardActor | AgentActor | NoneActor;

/**
 * Hono context variables available after middleware runs.
 */
export interface Variables {
  actor: Actor;
  db: import("@ciutatis/db-cloudflare").Db;
}

/**
 * Typed Hono context with our Env and Variables.
 */
export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

/**
 * Type helper for Hono app/router creation.
 */
export type AppEnv = { Bindings: Env; Variables: Variables };
