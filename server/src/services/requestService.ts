// Stub - requestService feature not in Ciutatis V1
// This file exists only to satisfy upstream imports

import type { Db } from "@paperclipai/db";
import type { Issue } from "@paperclipai/shared";

export interface IssueFilters {
  companyId?: string;
  status?: string;
}

export const ISSUE_LIST_DEFAULT_LIMIT = 20;
export const ISSUE_LIST_MAX_LIMIT = 100;

export interface IssueRelationSummary {
  issueId: string;
  relationType: string;
  relatedIssueId: string;
  status: string;
  identifier?: string | null;
}

export interface IssueRelationsSummary {
  blocks: IssueRelationSummary[];
  blockedBy: IssueRelationSummary[];
  relatesTo: IssueRelationSummary[];
}

export interface IssueUpdateInput {
  status?: string;
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
  goalId?: string | null;
  parentId?: string | null;
  title?: string;
  description?: string | null;
  priority?: string;
  blockedByIssueIds?: string[];
  executionState?: unknown | null;
}

export interface IssueService {
  listIssues(): Promise<Issue[]>;
  getIssue(): Promise<Issue | null>;
  // Upstream-only methods for type compatibility
  // Supports both upstream 2-arg pattern and V1 1-arg pattern
  getByIdentifier(_companyIdOrIdentifier: string, _identifier?: string): Promise<Issue | null>;
  getById(_companyIdOrId: string, _id?: string): Promise<Issue | null>;
  list(_companyId: string, _filters?: unknown): Promise<Issue[]>;
  listDependencyReadiness(_companyId: string, _issueIds: string[], _tx?: unknown): Promise<Map<string, { isDependencyReady: boolean; unresolvedBlockerCount: number; unresolvedBlockerIssueIds: string[] }>>;
  getDependencyReadiness(_companyId: string, _issueId: string): Promise<{ isDependencyReady: boolean; unresolvedBlockerCount: number; unresolvedBlockerIssueIds: string[] } | null>;
  clearExecutionWorkspaceEnvironmentSelection(_companyId: string, _issueId: string): Promise<void>;
  // Upstream-only: create and addComment for heartbeat integration
  create(_companyId: string, _input: unknown): Promise<Issue | null>;
  addComment(_companyId: string, _issueId: string, _body: string, _opts?: unknown, _meta?: unknown): Promise<unknown>;
  // Upstream-only: methods for recovery/service.ts
  // Supports both patterns: getRelationSummaries(issueId) and getRelationSummaries(companyId, issueId)
  getRelationSummaries(_companyIdOrIssueId: string, _issueId?: string): Promise<IssueRelationsSummary>;
  // Supports both patterns: update(issueId, input) and update(companyId, issueId, input)
  update(_idOrCompanyId: string, _input: IssueUpdateInput, _tx?: unknown): Promise<Issue | null>;
  // Upstream-only: checkout for heartbeat wake integration
  checkout(_issueId: string, _agentId: string, _statuses: string[], _runId: string): Promise<void>;
}

export function issueService(_db: Db): IssueService {
  return {
    async listIssues() {
      return [];
    },
    async getIssue() {
      return null;
    },
    async getByIdentifier(_companyIdOrIdentifier: string, _identifier?: string) {
      return null;
    },
    async getById(_companyIdOrId: string, _id?: string) {
      return null;
    },
    async list() {
      return [];
    },
    async listDependencyReadiness() {
      return new Map();
    },
    async getDependencyReadiness() {
      return null;
    },
    async clearExecutionWorkspaceEnvironmentSelection() {
      // No-op
    },
    async create() {
      return null;
    },
    async addComment() {
      return null;
    },
    async getRelationSummaries() {
      return { blocks: [], blockedBy: [], relatesTo: [] };
    },
    async update(_idOrCompanyId: string, _input: IssueUpdateInput, _tx?: unknown) {
      return null;
    },
    async checkout() {
      // No-op - checkout not implemented in Ciutatis V1 stub
    },
  };
}

export function deriveIssueUserContext() {
  return { userId: null, userType: null };
}

export function clampIssueListLimit(limit: number): number {
  return Math.min(Math.max(limit, 1), ISSUE_LIST_MAX_LIMIT);
}
