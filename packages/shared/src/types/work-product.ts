export type RequestWorkProductType =
  | "preview_url"
  | "runtime_service"
  | "pull_request"
  | "branch"
  | "commit"
  | "artifact"
  | "document";

export type RequestWorkProductProvider =
  | "paperclip"
  | "github"
  | "vercel"
  | "s3"
  | "custom";

export type RequestWorkProductStatus =
  | "active"
  | "ready_for_review"
  | "approved"
  | "changes_requested"
  | "merged"
  | "closed"
  | "failed"
  | "archived"
  | "draft";

export type RequestWorkProductReviewState =
  | "none"
  | "needs_board_review"
  | "approved"
  | "changes_requested";

export interface RequestWorkProduct {
  id: string;
  companyId: string;
  projectId: string | null;
  issueId: string;
  executionWorkspaceId: string | null;
  runtimeServiceId: string | null;
  type: RequestWorkProductType;
  provider: RequestWorkProductProvider | string;
  externalId: string | null;
  title: string;
  url: string | null;
  status: RequestWorkProductStatus | string;
  reviewState: RequestWorkProductReviewState;
  isPrimary: boolean;
  healthStatus: "unknown" | "healthy" | "unhealthy";
  summary: string | null;
  metadata: Record<string, unknown> | null;
  createdByRunId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IssueWorkProductType = RequestWorkProductType;
export type IssueWorkProductProvider = RequestWorkProductProvider;
export type IssueWorkProductStatus = RequestWorkProductStatus;
export type IssueWorkProductReviewState = RequestWorkProductReviewState;
export type IssueWorkProduct = RequestWorkProduct;
