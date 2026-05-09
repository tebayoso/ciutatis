// Stub file for upstream features not in Ciutatis
// Workspace command authz

import type { Request } from "express";

export function assertWorkspaceCommandAccess(): void {}

export function assertNoAgentHostWorkspaceCommandMutation(
  req: Request,
  paths: string[],
): void {
  // Ciutatis: no agent host workspace command restrictions
  return;
}

export function collectAgentAdapterWorkspaceCommandPaths(
  adapterConfig: Record<string, unknown>,
  path = "adapterConfig",
): string[] {
  // Ciutatis: no workspace command paths to collect
  return [];
}

export function collectExecutionWorkspaceCommandPaths(..._args: unknown[]): string[] {
  return [];
}

// Stub aliases for upstream compatibility
export const collectProjectExecutionWorkspaceCommandPaths = collectExecutionWorkspaceCommandPaths;
export const collectProjectWorkspaceCommandPaths = collectExecutionWorkspaceCommandPaths;
