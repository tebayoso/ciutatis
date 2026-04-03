import type { IssuePriority, IssueStatus } from "../constants.js";
import type { Objective } from "./objective.js";
import type { Project, ProjectWorkspace } from "./project.js";
import type { ExecutionWorkspace, IssueExecutionWorkspaceSettings } from "./workspace-runtime.js";
import type { RequestWorkProduct } from "./work-product.js";

export interface RequestAncestorProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  goalId: string | null;
  workspaces: ProjectWorkspace[];
  primaryWorkspace: ProjectWorkspace | null;
}

export interface RequestAncestorObjective {
  id: string;
  title: string;
  description: string | null;
  level: string;
  status: string;
}

export interface RequestAncestor {
  id: string;
  identifier: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  projectId: string | null;
  goalId: string | null;
  project: RequestAncestorProject | null;
  goal: RequestAncestorObjective | null;
}

export interface RequestLabel {
  id: string;
  companyId: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestAssigneeAdapterOverrides {
  adapterConfig?: Record<string, unknown>;
  useProjectWorkspace?: boolean;
}

export type DocumentFormat = "markdown";

export interface RequestDocumentSummary {
  id: string;
  companyId: string;
  issueId: string;
  key: string;
  title: string | null;
  format: DocumentFormat;
  latestRevisionId: string | null;
  latestRevisionNumber: number;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  updatedByAgentId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestDocument extends RequestDocumentSummary {
  body: string;
}

export interface DocumentRevision {
  id: string;
  companyId: string;
  documentId: string;
  issueId: string;
  key: string;
  revisionNumber: number;
  body: string;
  changeSummary: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
}

export interface LegacyPlanDocument {
  key: "plan";
  body: string;
  source: "issue_description";
}

export interface Request {
  id: string;
  companyId: string;
  projectId: string | null;
  projectWorkspaceId: string | null;
  goalId: string | null;
  parentId: string | null;
  ancestors?: RequestAncestor[];
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  checkoutRunId: string | null;
  executionRunId: string | null;
  executionAgentNameKey: string | null;
  executionLockedAt: Date | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  issueNumber: number | null;
  identifier: string | null;
  requestDepth: number;
  billingCode: string | null;
  assigneeAdapterOverrides: RequestAssigneeAdapterOverrides | null;
  executionWorkspaceId: string | null;
  executionWorkspacePreference: string | null;
  executionWorkspaceSettings: IssueExecutionWorkspaceSettings | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  hiddenAt: Date | null;
  labelIds?: string[];
  labels?: RequestLabel[];
  planDocument?: RequestDocument | null;
  documentSummaries?: RequestDocumentSummary[];
  legacyPlanDocument?: LegacyPlanDocument | null;
  project?: Project | null;
  goal?: Objective | null;
  currentExecutionWorkspace?: ExecutionWorkspace | null;
  workProducts?: RequestWorkProduct[];
  mentionedProjects?: Project[];
  myLastTouchAt?: Date | null;
  lastExternalCommentAt?: Date | null;
  isUnreadForMe?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestComment {
  id: string;
  companyId: string;
  issueId: string;
  authorAgentId: string | null;
  authorUserId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestAttachment {
  id: string;
  companyId: string;
  issueId: string;
  issueCommentId: string | null;
  assetId: string;
  provider: string;
  objectKey: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  originalFilename: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  contentPath: string;
}

// Backward-compat aliases
export type IssueAncestorProject = RequestAncestorProject;
export type IssueAncestorGoal = RequestAncestorObjective;
export type IssueAncestor = RequestAncestor;
export type IssueLabel = RequestLabel;
export type IssueAssigneeAdapterOverrides = RequestAssigneeAdapterOverrides;
export type IssueDocumentSummary = RequestDocumentSummary;
export type IssueDocument = RequestDocument;
export type Issue = Request;
export type IssueComment = RequestComment;
export type IssueAttachment = RequestAttachment;
