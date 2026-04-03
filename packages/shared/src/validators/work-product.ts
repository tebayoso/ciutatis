import { z } from "zod";

export const requestWorkProductTypeSchema = z.enum([
  "preview_url",
  "runtime_service",
  "pull_request",
  "branch",
  "commit",
  "artifact",
  "document",
]);

export const requestWorkProductStatusSchema = z.enum([
  "active",
  "ready_for_review",
  "approved",
  "changes_requested",
  "merged",
  "closed",
  "failed",
  "archived",
  "draft",
]);

export const requestWorkProductReviewStateSchema = z.enum([
  "none",
  "needs_board_review",
  "approved",
  "changes_requested",
]);

export const createRequestWorkProductSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  executionWorkspaceId: z.string().uuid().optional().nullable(),
  runtimeServiceId: z.string().uuid().optional().nullable(),
  type: requestWorkProductTypeSchema,
  provider: z.string().min(1),
  externalId: z.string().optional().nullable(),
  title: z.string().min(1),
  url: z.string().url().optional().nullable(),
  status: requestWorkProductStatusSchema.default("active"),
  reviewState: requestWorkProductReviewStateSchema.optional().default("none"),
  isPrimary: z.boolean().optional().default(false),
  healthStatus: z.enum(["unknown", "healthy", "unhealthy"]).optional().default("unknown"),
  summary: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  createdByRunId: z.string().uuid().optional().nullable(),
});

export type CreateRequestWorkProduct = z.infer<typeof createRequestWorkProductSchema>;

export const updateRequestWorkProductSchema = createRequestWorkProductSchema.partial();

export type UpdateRequestWorkProduct = z.infer<typeof updateRequestWorkProductSchema>;

export const issueWorkProductTypeSchema = requestWorkProductTypeSchema;
export const issueWorkProductStatusSchema = requestWorkProductStatusSchema;
export const issueWorkProductReviewStateSchema = requestWorkProductReviewStateSchema;
export const createIssueWorkProductSchema = createRequestWorkProductSchema;
export type CreateIssueWorkProduct = CreateRequestWorkProduct;
export const updateIssueWorkProductSchema = updateRequestWorkProductSchema;
export type UpdateIssueWorkProduct = UpdateRequestWorkProduct;
