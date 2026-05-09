// Stub file for upstream feature not used in ciutatis
// Goal resolution functions

import type { Db } from "@paperclipai/db";

export function goalService(_db: Db) {
  return {
    // Stub - goals not implemented in Ciutatis
  };
}

export function resolveIssueGoalId(_input: {
  companyId: string;
  projectId: string;
  title: string;
  db: unknown;
}): Promise<string | null> {
  return Promise.resolve(null);
}

export function resolveNextIssueGoalId(_input: {
  companyId: string;
  projectId: string;
  title: string;
  db: unknown;
}): Promise<string | null> {
  return Promise.resolve(null);
}

export function getDefaultCompanyGoal(_companyId: string, _db: unknown): Promise<unknown> {
  return Promise.resolve(null);
}
