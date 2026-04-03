import { z } from "zod";
import { REQUEST_PRIORITIES, REQUEST_STATUSES } from "../constants.js";

const executionWorkspaceStrategySchema = z
  .object({
    type: z.enum(["project_primary", "git_worktree", "adapter_managed", "cloud_sandbox"]).optional(),
    baseRef: z.string().optional().nullable(),
    branchTemplate: z.string().optional().nullable(),
    worktreeParentDir: z.string().optional().nullable(),
    provisionCommand: z.string().optional().nullable(),
    teardownCommand: z.string().optional().nullable(),
  })
  .strict();

export const requestExecutionWorkspaceSettingsSchema = z
  .object({
    mode: z.enum(["inherit", "shared_workspace", "isolated_workspace", "operator_branch", "reuse_existing", "agent_default"]).optional(),
    workspaceStrategy: executionWorkspaceStrategySchema.optional().nullable(),
    workspaceRuntime: z.record(z.unknown()).optional().nullable(),
  })
  .strict();

export const requestAssigneeAdapterOverridesSchema = z
  .object({
    adapterConfig: z.record(z.unknown()).optional(),
    useProjectWorkspace: z.boolean().optional(),
  })
  .strict();

export const createRequestSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  projectWorkspaceId: z.string().uuid().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(REQUEST_STATUSES).optional().default("backlog"),
  priority: z.enum(REQUEST_PRIORITIES).optional().default("medium"),
  assigneeAgentId: z.string().uuid().optional().nullable(),
  assigneeUserId: z.string().optional().nullable(),
  requestDepth: z.number().int().nonnegative().optional().default(0),
  billingCode: z.string().optional().nullable(),
  assigneeAdapterOverrides: requestAssigneeAdapterOverridesSchema.optional().nullable(),
  executionWorkspaceId: z.string().uuid().optional().nullable(),
  executionWorkspacePreference: z.enum([
    "inherit",
    "shared_workspace",
    "isolated_workspace",
    "operator_branch",
    "reuse_existing",
    "agent_default",
  ]).optional().nullable(),
  executionWorkspaceSettings: requestExecutionWorkspaceSettingsSchema.optional().nullable(),
  labelIds: z.array(z.string().uuid()).optional(),
});

export type CreateRequest = z.infer<typeof createRequestSchema>;

export const createRequestLabelSchema = z.object({
  name: z.string().trim().min(1).max(48),
  color: z.string().regex(/^#(?:[0-9a-fA-F]{6})$/, "Color must be a 6-digit hex value"),
});

export type CreateRequestLabel = z.infer<typeof createRequestLabelSchema>;

export const updateRequestSchema = createRequestSchema.partial().extend({
  comment: z.string().min(1).optional(),
  hiddenAt: z.string().datetime().nullable().optional(),
});

export type UpdateRequest = z.infer<typeof updateRequestSchema>;
export type RequestExecutionWorkspaceSettings = z.infer<typeof requestExecutionWorkspaceSettingsSchema>;

export const checkoutRequestSchema = z.object({
  agentId: z.string().uuid(),
  expectedStatuses: z.array(z.enum(REQUEST_STATUSES)).nonempty(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const addRequestCommentSchema = z.object({
  body: z.string().min(1),
  reopen: z.boolean().optional(),
  interrupt: z.boolean().optional(),
});

export type AddRequestComment = z.infer<typeof addRequestCommentSchema>;

export const linkRequestApprovalSchema = z.object({
  approvalId: z.string().uuid(),
});

export type LinkRequestApproval = z.infer<typeof linkRequestApprovalSchema>;

export const createRequestAttachmentMetadataSchema = z.object({
  issueCommentId: z.string().uuid().optional().nullable(),
});

export type CreateRequestAttachmentMetadata = z.infer<typeof createRequestAttachmentMetadataSchema>;

export const REQUEST_DOCUMENT_FORMATS = ["markdown"] as const;

export const requestDocumentFormatSchema = z.enum(REQUEST_DOCUMENT_FORMATS);

export const requestDocumentKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "Document key must be lowercase letters, numbers, _ or -");

export const upsertRequestDocumentSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  format: requestDocumentFormatSchema,
  body: z.string().max(524288),
  changeSummary: z.string().trim().max(500).nullable().optional(),
  baseRevisionId: z.string().uuid().nullable().optional(),
});

export type RequestDocumentFormat = z.infer<typeof requestDocumentFormatSchema>;
export type UpsertRequestDocument = z.infer<typeof upsertRequestDocumentSchema>;

// Backward-compat aliases
export const issueExecutionWorkspaceSettingsSchema = requestExecutionWorkspaceSettingsSchema;
export const issueAssigneeAdapterOverridesSchema = requestAssigneeAdapterOverridesSchema;
export const createIssueSchema = createRequestSchema;
export type CreateIssue = CreateRequest;
export const createIssueLabelSchema = createRequestLabelSchema;
export type CreateIssueLabel = CreateRequestLabel;
export const updateIssueSchema = updateRequestSchema;
export type UpdateIssue = UpdateRequest;
export type IssueExecutionWorkspaceSettings = RequestExecutionWorkspaceSettings;
export const checkoutIssueSchema = checkoutRequestSchema;
export type CheckoutIssue = CheckoutRequest;
export const addIssueCommentSchema = addRequestCommentSchema;
export type AddIssueComment = AddRequestComment;
export const linkIssueApprovalSchema = linkRequestApprovalSchema;
export type LinkIssueApproval = LinkRequestApproval;
export const createIssueAttachmentMetadataSchema = createRequestAttachmentMetadataSchema;
export type CreateIssueAttachmentMetadata = CreateRequestAttachmentMetadata;
export const ISSUE_DOCUMENT_FORMATS = REQUEST_DOCUMENT_FORMATS;
export const issueDocumentFormatSchema = requestDocumentFormatSchema;
export const issueDocumentKeySchema = requestDocumentKeySchema;
export const upsertIssueDocumentSchema = upsertRequestDocumentSchema;
export type IssueDocumentFormat = RequestDocumentFormat;
export type UpsertIssueDocument = UpsertRequestDocument;
