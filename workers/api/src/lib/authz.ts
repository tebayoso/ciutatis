import type { AppContext, Actor } from "./types.js";
import { forbidden, unauthorized } from "./errors.js";

/**
 * Assert the current actor is a board member (human operator).
 * Throws 403 if not.
 */
export function assertBoard(c: AppContext): asserts c is AppContext & { var: { actor: Extract<Actor, { type: "board" }> } } {
  const actor = c.get("actor");
  if (actor.type !== "board") {
    throw forbidden("Board access required");
  }
}

/**
 * Assert the current actor has access to the given company.
 * - Agents can only access their own company.
 * - Board users need membership or instance admin.
 * - None actors are rejected.
 */
export function assertCompanyAccess(c: AppContext, companyId: string): void {
  const actor = c.get("actor");
  if (actor.type === "none") {
    throw unauthorized();
  }
  if (actor.type === "agent" && actor.companyId !== companyId) {
    throw forbidden("Agent key cannot access another company");
  }
  if (actor.type === "board" && actor.source !== "local_implicit" && !actor.isInstanceAdmin) {
    const allowedCompanies = actor.companyIds ?? [];
    if (!allowedCompanies.includes(companyId)) {
      throw forbidden("User does not have access to this company");
    }
  }
}

/**
 * Get normalized actor info for activity logging.
 * Throws 401 if actor is unauthenticated.
 */
export function getActorInfo(c: AppContext) {
  const actor = c.get("actor");
  if (actor.type === "none") {
    throw unauthorized();
  }
  if (actor.type === "agent") {
    return {
      actorType: "agent" as const,
      actorId: actor.agentId ?? "unknown-agent",
      agentId: actor.agentId ?? null,
      runId: actor.runId ?? null,
    };
  }
  return {
    actorType: "user" as const,
    actorId: actor.userId ?? "board",
    agentId: null,
    runId: actor.runId ?? null,
  };
}
