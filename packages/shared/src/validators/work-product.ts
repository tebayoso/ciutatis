import { z } from "zod";
import { workspaceFileRefSchema } from "./workspace-file-resource.js";

function attachmentContentPath(attachmentId: string): string {
  return `/api/attachments/${attachmentId}/content`;
}

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
export const attachmentArtifactWorkProductMetadataSchema = z.object({
  attachmentId: z.string().uuid(),
  contentType: z.string().min(1),
  byteSize: z.number().int().nonnegative(),
  contentPath: z.string().min(1),
  openPath: z.string().min(1),
  downloadPath: z.string().min(1),
  originalFilename: z.string().optional().nullable(),
}).superRefine((value, ctx) => {
  const contentPath = attachmentContentPath(value.attachmentId);
  if (value.contentPath !== contentPath) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contentPath"],
      message: "contentPath must point to the same-origin attachment content route",
    });
  }
  if (value.openPath !== contentPath) {
      path: ["openPath"],
      message: "openPath must point to the same-origin attachment content route",
  if (value.downloadPath !== `${contentPath}?download=1`) {
      path: ["downloadPath"],
      message: "downloadPath must point to the same-origin attachment download route",
});

export type AttachmentArtifactWorkProductMetadata = z.infer<typeof attachmentArtifactWorkProductMetadataSchema>;

export const issueWorkProductMetadataSchema = z
  .object({
    resourceRef: workspaceFileRefSchema.optional().nullable(),
  })
  .passthrough();

export type IssueWorkProductMetadata = z.infer<typeof issueWorkProductMetadataSchema>;

export const createIssueWorkProductSchema = z.object({
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
  metadata: issueWorkProductMetadataSchema.optional().nullable(),
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
