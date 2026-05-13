import type { IssueStatus } from "../constants.js";

export type IssueTreeControlMode = "pause" | "resume" | "cancel" | "restore";

export type IssueTreeHoldStatus = "active" | "released" | "superseded";

export type IssueTreeHoldReleasePolicyStrategy = "manual" | "auto_on_ready" | "after_active_runs_finish";

export interface IssueTreeHoldReleasePolicy {
  strategy: IssueTreeHoldReleasePolicyStrategy;
  readyAfterMinutes?: number | null;
  note?: string | null;
}

export interface IssueTreePreviewTotals {
  totalIssues: number;
  affectedIssues: number;
  skippedIssues: number;
  activeRuns: number;
  queuedRuns: number;
  affectedAgents: number;
}

export interface IssueTreePreviewWarning {
  code: string;
  message: string;
  issueId?: string | null;
  issueIds?: string[];
}

export interface IssueTreePreviewRun {
  id: string;
  issueId: string;
  agentId: string;
  status: "queued" | "running";
  startedAt: Date | null;
  createdAt?: Date;
}

export interface IssueTreePreviewIssue {
  id: string;
  identifier: string | null;
  title: string;
  status: IssueStatus;
  parentId: string | null;
  depth: number;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  activeRun: IssueTreePreviewRun | null;
  activeHoldIds: string[];
  action: IssueTreeControlMode;
  skipped: boolean;
  skipReason: string | null;
}

export interface IssueTreePreviewAgent {
  agentId: string;
  issueCount: number;
  activeRunCount?: number;
}

export interface IssueTreeControlPreview {
  companyId: string;
  rootIssueId: string;
  mode: IssueTreeControlMode;
  generatedAt: Date;
  releasePolicy: IssueTreeHoldReleasePolicy;
  totals: IssueTreePreviewTotals;
  countsByStatus: Partial<Record<IssueStatus, number>>;
  issues: IssueTreePreviewIssue[];
  skippedIssues: IssueTreePreviewIssue[];
  activeRuns: IssueTreePreviewRun[];
  affectedAgents: IssueTreePreviewAgent[];
  warnings: IssueTreePreviewWarning[];
}

export interface IssueTreeHoldMember {
  id: string;
  companyId: string;
  holdId: string;
  issueId: string;
  parentIssueId: string | null;
  depth: number;
  issueIdentifier: string | null;
  issueTitle: string;
  issueStatus: string;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  activeRunId: string | null;
  activeRunStatus: string | null;
  skipped: boolean;
  skipReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueTreeHold {
  id: string;
  companyId: string;
  rootIssueId: string;
  mode: IssueTreeControlMode;
  status: IssueTreeHoldStatus;
  reason: string | null;
  releasePolicy: IssueTreeHoldReleasePolicy | null;
  releaseReason?: string | null;
  releaseMetadata?: Record<string, unknown> | null;
  releasedAt: Date | null;
  releasedByActorType: string | null;
  releasedByAgentId: string | null;
  releasedByUserId: string | null;
  releasedByRunId: string | null;
  createdByActorType: string;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdByRunId: string | null;
  supersededByHoldId: string | null;
  members?: IssueTreeHoldMember[];
  createdAt: Date;
  updatedAt: Date;
}

// Issue graph liveness auto recovery types
export const DEFAULT_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS = 24;
export const MAX_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS = 168; // 7 days
export const MIN_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS = 1;

export interface IssueGraphLivenessAutoRecoveryPreviewItem {
  issueId: string;
  identifier: string | null;
  title?: string;
  reason: string;
  action: string;
  // Extended properties used by upstream recovery service
  state?: string;
  severity?: string;
  recoveryIssueId?: string;
  recoveryIdentifier?: string | null;
  recoveryTitle?: string | null;
  recommendedOwnerAgentId?: string | null;
  incidentKey?: string | null;
  latestDependencyUpdatedAt?: string;
  dependencyPath?: Array<{ issueId: string; identifier: string | null; title: string }>;
}

export interface IssueGraphLivenessAutoRecoveryPreview {
  items: IssueGraphLivenessAutoRecoveryPreviewItem[];
  totalIssues: number;
  wouldRecover: number;
  lookbackHours: number;
  cutoff?: Date | string;
  // Extended properties used by upstream recovery service
  generatedAt?: Date | string;
  findings?: number;
  recoverableFindings?: number;
  skippedOutsideLookback?: number;
}
