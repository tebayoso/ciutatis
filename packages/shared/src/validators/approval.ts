import { z } from "zod";
import { APPROVAL_TYPES } from "../constants.js";

/**
 * Normalizes escaped line breaks (\n, \r\n) to actual line breaks
 */
function normalizeLineBreaks(value: string | null | undefined): string | null | undefined {
  if (typeof value !== "string") return value;
  return value.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
}

export const createApprovalSchema = z.object({
  type: z.enum(APPROVAL_TYPES),
  requestedByAgentId: z.string().uuid().optional().nullable(),
  payload: z.record(z.unknown()),
  issueIds: z.array(z.string().uuid()).optional(),
});

export type CreateApproval = z.infer<typeof createApprovalSchema>;

export const resolveApprovalSchema = z.object({
  decisionNote: z.string()
    .optional()
    .nullable()
    .transform(normalizeLineBreaks),
  decidedByUserId: z.string().optional().default("board"),
});

export type ResolveApproval = z.infer<typeof resolveApprovalSchema>;

export const requestApprovalRevisionSchema = z.object({
  decisionNote: z.string()
    .optional()
    .nullable()
    .transform(normalizeLineBreaks),
  decidedByUserId: z.string().optional().default("board"),
});

export type RequestApprovalRevision = z.infer<typeof requestApprovalRevisionSchema>;

export const resubmitApprovalSchema = z.object({
  payload: z.record(z.unknown()).optional(),
});

export type ResubmitApproval = z.infer<typeof resubmitApprovalSchema>;

export const addApprovalCommentSchema = z.object({
  body: z.string()
    .min(1)
    .transform(normalizeLineBreaks),
});

export type AddApprovalComment = z.infer<typeof addApprovalCommentSchema>;
