// Stub file for upstream authz features not in Ciutatis
// Company member roles service

import type { Request } from "express";

export type ActorType = "system" | "agent" | "user" | "plugin";

export interface ActorInfo {
  actorType: ActorType;
  actorId: string;
  agentId: string | null;
  runId?: string | null;
}

export function assertAuthenticated(_req?: Request): void {
  // Ciutatis: authentication handled at middleware layer
  // Stub: assume authenticated for now
  return;
}

export function assertInstanceAdmin(_req?: Request): void {
  // Ciutatis: instance admin check handled at middleware layer
  // Stub: assume authorized for now
  return;
}

export function assertBoard(req: Request): void {
  // Ciutatis: board access is full-control operator context
  // Stub: assume authorized for now
  return;
}

export function assertCompanyAccess(req: Request, companyId: string): void {
  // Ciutatis: company-scoped access check
  // Stub: assume authorized for now
  return;
}

export function getActorInfo(req: Request): ActorInfo {
  // Return mock actor info for activity logging
  // Ciutatis: board access is treated as system-level operator context
  return {
    actorType: "system",
    actorId: "board",
    agentId: null,
  };
}

export function assertBoardOrgAccess(_req: Request, _orgId: string): void {
  // Ciutatis: board access is full-control operator context
  // Stub: assume authorized for now
  return;
}
