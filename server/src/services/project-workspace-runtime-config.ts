// Stub file for upstream feature not used in ciutatis
// Project workspace runtime config functions

import type { WorkspaceRuntimeDesiredState } from "@paperclipai/shared";

export interface ProjectWorkspaceRuntimeConfig {
  workspaceRuntime?: {
    desiredState: WorkspaceRuntimeDesiredState;
    serviceStates?: Record<string, unknown> | null;
  } | null;
}

export function readProjectWorkspaceRuntimeConfig(
  _metadata: Record<string, unknown> | null,
): Record<string, unknown> | null {
  return null;
}

export function mergeProjectWorkspaceRuntimeConfig(
  _base: Record<string, unknown> | null,
  _override: Record<string, unknown> | null,
): Record<string, unknown> | null {
  return null;
}
