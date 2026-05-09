// Stub file for upstream features not in Ciutatis
// Invite grants service

import type { PermissionKey } from "@paperclipai/shared";
import type { HumanRole } from "./company-member-roles.js";

export function humanJoinGrantsFromDefaults(
  defaultsPayload: Record<string, unknown> | null | undefined,
  _role?: HumanRole | null,
): Array<{ permissionKey: PermissionKey; scope: Record<string, unknown> | null }> {
  // Ciutatis: simplified - no granular grants
  return [];
}

export function getInviteGrants(): unknown[] {
  return [];
}
