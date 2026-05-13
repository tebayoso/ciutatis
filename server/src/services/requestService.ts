import { and, desc, eq, ilike, isNull, max, or } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  assets,
  companies,
  issueAttachments,
  issueComments,
  issueLabels,
  issues,
} from "@paperclipai/db";
import type { Issue, IssueAttachment, IssueComment } from "@paperclipai/shared";

export interface IssueFilters {
  companyId?: string;
  status?: string;
  projectId?: string;
  assigneeAgentId?: string;
  assigneeUserId?: string;
  touchedByUserId?: string;
  unreadForUserId?: string;
  labelId?: string;
  q?: string;
  [key: string]: unknown;
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
  [key: string]: unknown;
}

export interface IssueService {
  listIssues(companyId?: string, filters?: IssueFilters): Promise<Issue[]>;
  getIssue(id: string): Promise<Issue | null>;
  getByIdentifier(_companyIdOrIdentifier: string, _identifier?: string): Promise<Issue | null>;
  getById(_companyIdOrId: string, _id?: string): Promise<Issue | null>;
  list(_companyId: string, _filters?: IssueFilters): Promise<Issue[]>;
  listDependencyReadiness(_companyId: string, _issueIds: string[], _tx?: unknown): Promise<Map<string, { isDependencyReady: boolean; unresolvedBlockerCount: number; unresolvedBlockerIssueIds: string[] }>>;
  getDependencyReadiness(_companyId: string, _issueId: string): Promise<{ isDependencyReady: boolean; unresolvedBlockerCount: number; unresolvedBlockerIssueIds: string[] } | null>;
  clearExecutionWorkspaceEnvironmentSelection(_companyId: string, _issueId: string): Promise<void>;
  create(_companyId: string, _input: IssueUpdateInput): Promise<Issue | null>;
  createChild?(_parentId: string, _input: IssueUpdateInput): Promise<{ issue: Issue; parentBlockerAdded: boolean }>;
  addComment(_companyIdOrIssueId: string, _issueIdOrBody: string, _bodyOrOpts?: string | Record<string, unknown>, _opts?: unknown, _meta?: unknown): Promise<IssueComment | null>;
  getRelationSummaries(_companyIdOrIssueId: string, _issueId?: string): Promise<IssueRelationsSummary>;
  update(_idOrCompanyId: string, _inputOrIssueId: IssueUpdateInput | string, _inputOrTx?: IssueUpdateInput | unknown): Promise<Issue | null>;
  checkout(_issueId: string, _agentId: string, _statuses: string[], _runId: string): Promise<void>;
  assertCheckoutOwner?(_issueId: string, _agentId: string, _runId?: string | null): Promise<{ adoptedFromRunId: string | null }>;
  remove?(_issueId: string): Promise<Issue | null>;
  listAttachments?(_issueId: string): Promise<IssueAttachment[]>;
  getAttachmentById?(_attachmentId: string): Promise<(IssueAttachment & { objectKey?: string }) | null>;
  removeAttachment?(_attachmentId: string): Promise<(IssueAttachment & { objectKey?: string }) | null>;
  findMentionedAgents?(): Promise<unknown[]>;
}

function shapeIssue(row: typeof issues.$inferSelect): Issue {
  return {
    ...row,
    labelIds: [],
    labels: [],
    documentSummaries: [],
  } as unknown as Issue;
}

function normalizePatch(input: IssueUpdateInput): Partial<typeof issues.$inferInsert> {
  const allowed = [
    "projectId",
    "projectWorkspaceId",
    "goalId",
    "parentId",
    "title",
    "description",
    "status",
    "priority",
    "assigneeAgentId",
    "assigneeUserId",
    "requestDepth",
    "billingCode",
    "assigneeAdapterOverrides",
    "executionWorkspaceId",
    "executionWorkspacePreference",
    "executionWorkspaceSettings",
    "hiddenAt",
    "executionState",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  patch.updatedAt = new Date();
  return patch as Partial<typeof issues.$inferInsert>;
}

async function nextIssueIdentity(db: Db, companyId: string) {
  const company = await db.select().from(companies).where(eq(companies.id, companyId)).then((rows) => rows[0] ?? null);
  const [{ value }] = await db
    .select({ value: max(issues.issueNumber) })
    .from(issues)
    .where(eq(issues.companyId, companyId));
  const issueNumber = (value ?? 0) + 1;
  return {
    issueNumber,
    identifier: company?.issuePrefix ? `${company.issuePrefix}-${issueNumber}` : null,
  };
}

export function issueService(db: Db): IssueService {
  async function getByIdRaw(id: string) {
    return db.select().from(issues).where(eq(issues.id, id)).then((rows) => rows[0] ?? null);
  }

  return {
    async listIssues(companyId, filters) {
      if (!companyId) return [];
      return this.list(companyId, filters);
    },
    async getIssue(id) {
      return this.getById(id);
    },
    async getByIdentifier(companyIdOrIdentifier: string, identifier?: string) {
      const conditions = identifier
        ? and(eq(issues.companyId, companyIdOrIdentifier), eq(issues.identifier, identifier.toUpperCase()))
        : eq(issues.identifier, companyIdOrIdentifier.toUpperCase());
      const row = await db.select().from(issues).where(conditions).then((rows) => rows[0] ?? null);
      return row ? shapeIssue(row) : null;
    },
    async getById(companyIdOrId: string, id?: string) {
      const conditions = id
        ? and(eq(issues.companyId, companyIdOrId), eq(issues.id, id))
        : eq(issues.id, companyIdOrId);
      const row = await db.select().from(issues).where(conditions).then((rows) => rows[0] ?? null);
      return row ? shapeIssue(row) : null;
    },
    async list(companyId, filters = {}) {
      const conditions = [eq(issues.companyId, companyId), isNull(issues.hiddenAt)];
      if (filters.status) conditions.push(eq(issues.status, filters.status));
      if (filters.projectId) conditions.push(eq(issues.projectId, filters.projectId));
      if (filters.assigneeAgentId) conditions.push(eq(issues.assigneeAgentId, filters.assigneeAgentId));
      if (filters.assigneeUserId) conditions.push(eq(issues.assigneeUserId, filters.assigneeUserId));
      if (filters.q) {
        const pattern = `%${filters.q.replace(/[%_\\]/g, "\\$&")}%`;
        conditions.push(or(ilike(issues.title, pattern), ilike(issues.description, pattern), ilike(issues.identifier, pattern))!);
      }
      let rows = await db
        .select()
        .from(issues)
        .where(and(...conditions))
        .orderBy(desc(issues.updatedAt));
      if (filters.labelId) {
        const issueIds = await db
          .select({ issueId: issueLabels.issueId })
          .from(issueLabels)
          .where(and(eq(issueLabels.companyId, companyId), eq(issueLabels.labelId, filters.labelId)));
        const allowedIds = new Set(issueIds.map((row) => row.issueId));
        rows = rows.filter((row) => allowedIds.has(row.id));
      }
      return rows.map(shapeIssue);
    },
    async listDependencyReadiness(_companyId, issueIds) {
      return new Map(issueIds.map((id) => [id, {
        isDependencyReady: true,
        unresolvedBlockerCount: 0,
        unresolvedBlockerIssueIds: [],
      }]));
    },
    async getDependencyReadiness() {
      return { isDependencyReady: true, unresolvedBlockerCount: 0, unresolvedBlockerIssueIds: [] };
    },
    async clearExecutionWorkspaceEnvironmentSelection() {
      // No persistent selection to clear in the minimal table-backed service.
    },
    async create(companyId, input) {
      const identity = await nextIssueIdentity(db, companyId);
      const [row] = await db
        .insert(issues)
        .values({
          companyId,
          ...normalizePatch(input),
          title: String(input.title ?? "Untitled request"),
          status: String(input.status ?? "backlog"),
          priority: String(input.priority ?? "medium"),
          issueNumber: identity.issueNumber,
          identifier: identity.identifier,
          createdByAgentId: typeof input.createdByAgentId === "string" ? input.createdByAgentId : null,
          createdByUserId: typeof input.createdByUserId === "string" ? input.createdByUserId : null,
        })
        .returning();
      const labelIds = Array.isArray(input.labelIds) ? input.labelIds.filter((id): id is string => typeof id === "string") : [];
      if (row && labelIds.length > 0) {
        await db.insert(issueLabels).values(labelIds.map((labelId) => ({ companyId, issueId: row.id, labelId }))).onConflictDoNothing();
      }
      return row ? shapeIssue(row) : null;
    },
    async createChild(parentId, input) {
      const parent = await getByIdRaw(parentId);
      if (!parent) return { issue: null as unknown as Issue, parentBlockerAdded: false };
      const issue = await this.create(parent.companyId, { ...input, parentId });
      return { issue: issue!, parentBlockerAdded: Boolean(input.blockParentUntilDone) };
    },
    async addComment(companyIdOrIssueId, issueIdOrBody, bodyOrOpts, opts) {
      const twoArg = typeof bodyOrOpts !== "string";
      const issueId = twoArg ? companyIdOrIssueId : issueIdOrBody;
      const body = twoArg ? issueIdOrBody : bodyOrOpts;
      const issue = await getByIdRaw(issueId);
      if (!issue || typeof body !== "string") return null;
      const meta = (twoArg ? bodyOrOpts : opts) as Record<string, unknown> | undefined;
      const [comment] = await db.insert(issueComments).values({
        companyId: issue.companyId,
        issueId: issue.id,
        body,
        authorAgentId: typeof meta?.agentId === "string" ? meta.agentId : null,
        authorUserId: typeof meta?.userId === "string" ? meta.userId : null,
        createdByRunId: typeof meta?.runId === "string" ? meta.runId : null,
      }).returning();
      return comment as unknown as IssueComment;
    },
    async getRelationSummaries() {
      return { blocks: [], blockedBy: [], relatesTo: [] };
    },
    async update(idOrCompanyId, inputOrIssueId, inputOrTx) {
      const issueId = typeof inputOrIssueId === "string" ? inputOrIssueId : idOrCompanyId;
      const input = (typeof inputOrIssueId === "string" ? inputOrTx : inputOrIssueId) as IssueUpdateInput;
      const [row] = await db
        .update(issues)
        .set(normalizePatch(input))
        .where(eq(issues.id, issueId))
        .returning();
      return row ? shapeIssue(row) : null;
    },
    async checkout(issueId, agentId, _statuses, runId) {
      await db.update(issues).set({
        assigneeAgentId: agentId,
        checkoutRunId: runId,
        status: "in_progress",
        updatedAt: new Date(),
      }).where(eq(issues.id, issueId));
    },
    async assertCheckoutOwner() {
      return { adoptedFromRunId: null };
    },
    async remove(issueId) {
      const [row] = await db
        .update(issues)
        .set({ hiddenAt: new Date(), updatedAt: new Date() })
        .where(eq(issues.id, issueId))
        .returning();
      return row ? shapeIssue(row) : null;
    },
    async listAttachments(issueId) {
      return db
        .select({
          id: issueAttachments.id,
          companyId: issueAttachments.companyId,
          issueId: issueAttachments.issueId,
          issueCommentId: issueAttachments.issueCommentId,
          assetId: issueAttachments.assetId,
          createdAt: issueAttachments.createdAt,
          updatedAt: issueAttachments.updatedAt,
          provider: assets.provider,
          objectKey: assets.objectKey,
          contentType: assets.contentType,
          byteSize: assets.byteSize,
          sha256: assets.sha256,
          originalFilename: assets.originalFilename,
          createdByAgentId: assets.createdByAgentId,
          createdByUserId: assets.createdByUserId,
          contentPath: assets.objectKey,
        })
        .from(issueAttachments)
        .innerJoin(assets, eq(issueAttachments.assetId, assets.id))
        .where(eq(issueAttachments.issueId, issueId)) as unknown as Promise<IssueAttachment[]>;
    },
    async getAttachmentById(attachmentId) {
      const rows = await db
        .select({
          id: issueAttachments.id,
          companyId: issueAttachments.companyId,
          issueId: issueAttachments.issueId,
          issueCommentId: issueAttachments.issueCommentId,
          assetId: issueAttachments.assetId,
          createdAt: issueAttachments.createdAt,
          updatedAt: issueAttachments.updatedAt,
          provider: assets.provider,
          objectKey: assets.objectKey,
          contentType: assets.contentType,
          byteSize: assets.byteSize,
          sha256: assets.sha256,
          originalFilename: assets.originalFilename,
          createdByAgentId: assets.createdByAgentId,
          createdByUserId: assets.createdByUserId,
          contentPath: assets.objectKey,
        })
        .from(issueAttachments)
        .innerJoin(assets, eq(issueAttachments.assetId, assets.id))
        .where(eq(issueAttachments.id, attachmentId));
      return (rows[0] ?? null) as (IssueAttachment & { objectKey?: string }) | null;
    },
    async removeAttachment(attachmentId) {
      const existing = await this.getAttachmentById?.(attachmentId) ?? null;
      await db.delete(issueAttachments).where(eq(issueAttachments.id, attachmentId));
      return existing;
    },
    async findMentionedAgents() {
      return [];
    },
  };
}

type IssueUserContextTimestamp = Date | string | null | undefined;

function parseIssueUserContextDate(value: IssueUserContextTimestamp): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function latestIssueUserContextDate(
  ...values: IssueUserContextTimestamp[]
): Date | null {
  let latest: Date | null = null;
  for (const value of values) {
    const parsed = parseIssueUserContextDate(value);
    if (parsed && (!latest || parsed.getTime() > latest.getTime())) {
      latest = parsed;
    }
  }
  return latest;
}

export function deriveIssueUserContext(
  issue: {
    createdByUserId?: string | null;
    assigneeUserId?: string | null;
    createdAt?: IssueUserContextTimestamp;
    updatedAt?: IssueUserContextTimestamp;
  },
  userId: string | null | undefined,
  timestamps: {
    myLastCommentAt?: IssueUserContextTimestamp;
    myLastReadAt?: IssueUserContextTimestamp;
    lastExternalCommentAt?: IssueUserContextTimestamp;
  } = {},
) {
  const fallbackTouchAt =
    userId && issue.createdByUserId === userId
      ? issue.createdAt
      : userId && issue.assigneeUserId === userId
        ? issue.updatedAt
        : null;
  const myLastTouchAt = latestIssueUserContextDate(
    timestamps.myLastCommentAt,
    timestamps.myLastReadAt,
    fallbackTouchAt,
  );
  const lastExternalCommentAt = parseIssueUserContextDate(timestamps.lastExternalCommentAt);

  return {
    myLastTouchAt,
    lastExternalCommentAt,
    isUnreadForMe: Boolean(
      lastExternalCommentAt &&
        (!myLastTouchAt || lastExternalCommentAt.getTime() > myLastTouchAt.getTime()),
    ),
  };
}

export function clampIssueListLimit(limit: number): number {
  return Math.min(Math.max(limit, 1), ISSUE_LIST_MAX_LIMIT);
}
