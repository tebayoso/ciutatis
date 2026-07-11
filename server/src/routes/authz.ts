// Stub file for upstream authz features not in Ciutatis
// Company member roles service

import type { Request } from "express";
import { forbidden, HttpError, unauthorized } from "../errors.js";
import { logger } from "../middleware/logger.js";
import { responsibleUserAuthzShadowMode } from "../services/authorization.js";

function throwOrShadowResponsibleUserCompanyAccessDeny(
  req: Request,
  companyId: string,
  code: "RESPONSIBLE_USER_UNAUTHORIZED" | "RESPONSIBLE_USER_UNAVAILABLE",
  message: string,
) {
  logger.warn({
    authzMode: responsibleUserAuthzShadowMode() ? "shadow" : "enforce",
    code,
    action: "company_access",
    companyId,
    actorAgentId: req.actor.agentId ?? null,
    responsibleUserId: req.actor.onBehalfOfUserId ?? null,
    method: req.method,
  }, "responsible-user company access intersection denied");
  if (responsibleUserAuthzShadowMode()) return;
  throw new HttpError(403, message, { code });
}

export type ActorType = "system" | "agent" | "user" | "plugin";

export interface ActorInfo {
  actorType: ActorType;
  actorId: string;
  agentId: string | null;
  runId?: string | null;
}

export function assertAuthenticated(req?: Request): void {
  if (!req?.actor || req.actor.type === "none") {
    throw unauthorized();
  }
}

export function assertInstanceAdmin(_req?: Request): void {
  assertAuthenticated(_req);
  if (_req?.actor.type === "board" && (_req.actor.source === "local_implicit" || _req.actor.isInstanceAdmin)) {
    return;
  }
  throw forbidden();
}

export function assertBoard(req: Request): void {
  assertAuthenticated(req);
  if (req.actor.type !== "board") {
    throw forbidden("Board access required");
  }
}

export function assertCompanyAccess(req: Request, companyId: string): void {
export function hasBoardOrgAccess(req: Request) {
  if (req.actor.type !== "board") {
    return false;
  }
  if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) {
    return true;
  return Array.isArray(req.actor.companyIds) && req.actor.companyIds.length > 0;
}

export function assertBoardOrgAccess(req: Request) {
  assertBoard(req);
  if (hasBoardOrgAccess(req)) {
    return;
  throw forbidden("Company membership or instance admin access required");

export function assertBoardOrAgent(req: Request) {
  if (req.actor.type === "agent") {
  if (req.actor.type === "board") {
    assertBoardOrgAccess(req);
  throw forbidden("Board or agent access required");

export function assertInstanceAdmin(req: Request) {
  throw forbidden("Instance admin access required");

export function assertCompanyAccess(req: Request, companyId: string) {
  assertAuthenticated(req);
  if (req.actor.type === "board" && req.actor.source === "local_implicit") return;
  if (req.actor.isInstanceAdmin) return;
  if (req.actor.type === "board") {
    const allowed = new Set(req.actor.companyIds ?? []);
    if (allowed.has(companyId)) return;
  }
  if (req.actor.type === "agent") {
    if (req.actor.companyId === companyId) return;
    throw forbidden("Agent key cannot access another company");
  }
  throw forbidden();
}

export function getActorInfo(req: Request): ActorInfo {
  if (req.actor?.type === "agent" && req.actor.agentId) {
  if (req.actor.type === "agent" && req.actor.onBehalfOfUserId?.trim()) {
    const membership = req.actor.onBehalfOfMemberships?.find(
      (item) => item.companyId === companyId && item.status === "active",
    );
    if (!membership) {
      throwOrShadowResponsibleUserCompanyAccessDeny(
        req,
        companyId,
        "RESPONSIBLE_USER_UNAVAILABLE",
        "Responsible user is unavailable for this company",
      );
      return;
    }
    const method = typeof req.method === "string" ? req.method.toUpperCase() : "GET";
    const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(method);
    if (!isSafeMethod && membership.membershipRole === "viewer") {
        "RESPONSIBLE_USER_UNAUTHORIZED",
        "Responsible user is not authorized for write access",
  }
  if (req.actor.type === "board" && req.actor.source !== "local_implicit") {
    const allowedCompanies = req.actor.companyIds ?? [];
    if (!allowedCompanies.includes(companyId)) {
      throw forbidden("User does not have access to this company");
    if (!isSafeMethod && !req.actor.isInstanceAdmin && Array.isArray(req.actor.memberships)) {
      const membership = req.actor.memberships.find((item) => item.companyId === companyId);
      if (!membership || membership.status !== "active") {
        throw forbidden("User does not have active company access");
      }
      if (membership.membershipRole === "viewer") {
        throw forbidden("Viewer access is read-only");

export function getActorInfo(req: Request): (
  {
    actorType: "agent";
    actorId: string;
    agentId: string | null;
    runId: string | null;
    actorSource: "agent_key" | "agent_jwt";
  | {
    actorType: "user";
    agentId: null;
    actorSource: "local_implicit" | "session" | "board_key" | "cloud_tenant";
) {
  assertAuthenticated(req);
  if (req.actor.type === "agent") {
    const actorSource = req.actor.source === "agent_jwt" ? "agent_jwt" : "agent_key";
    return {
      actorType: "agent",
      actorId: req.actor.agentId,
      agentId: req.actor.agentId,
      runId: req.actor.runId ?? null,
    };
  }
  if (req.actor?.type === "board" && req.actor.userId) {
    return {
      actorType: "user",
      actorId: req.actor.userId,
      agentId: null,
      runId: req.actor.runId ?? null,
      actorSource,
    };
  }

  const actorSource =
    req.actor.source === "local_implicit" ||
      req.actor.source === "board_key" ||
      req.actor.source === "cloud_tenant"
      ? req.actor.source
      : "session";

  return {
    actorType: "system",
    actorId: "board",
    agentId: null,
    runId: req.actor.runId ?? null,
    actorSource,
  };
}

export function assertBoardOrgAccess(req: Request, orgId: string): void {
  assertBoard(req);
  if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) return;
  if (orgId !== "instance") {
    assertCompanyAccess(req, orgId);
    return;
  }
  if ((req.actor.companyIds ?? []).length > 0) return;
  if ((req.actor.memberships ?? []).some((membership) => membership.status === "active")) return;
  throw forbidden();
}
