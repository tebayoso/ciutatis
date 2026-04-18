import { z } from "zod";
import {
  PUBLIC_PORTAL_LOCALES,
  PUBLIC_REQUEST_CATEGORIES,
  PUBLIC_SUBMISSION_MODES,
} from "../public-portal.js";

export const publicRequestCreateSchema = z
  .object({
    institutionId: z.string().uuid().nullable().optional(),
    institutionSlug: z.string().trim().min(2).max(120).nullable().optional(),
    submissionMode: z.enum(PUBLIC_SUBMISSION_MODES),
    title: z.string().trim().min(4).max(180),
    description: z.string().trim().min(12).max(8000),
    category: z.enum(PUBLIC_REQUEST_CATEGORIES),
    locationLabel: z.string().trim().max(180).nullable().optional(),
    contactName: z.string().trim().max(120).nullable().optional(),
    contactEmail: z.string().trim().email().max(320).nullable().optional(),
    locale: z.enum(PUBLIC_PORTAL_LOCALES),
    sourcePath: z.string().trim().min(1).max(2048).startsWith("/"),
  })
  .superRefine((value, ctx) => {
    if (!value.institutionId && !value.institutionSlug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "institutionId or institutionSlug is required",
        path: ["institutionId"],
      });
    }

    if (value.submissionMode === "guest") {
      if (!value.contactName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "contactName is required for guest submissions",
          path: ["contactName"],
        });
      }
      if (!value.contactEmail?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "contactEmail is required for guest submissions",
          path: ["contactEmail"],
        });
      }
    }

    if (value.submissionMode === "anonymous") {
      if (value.contactName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Anonymous submissions cannot include contactName",
          path: ["contactName"],
        });
      }
      if (value.contactEmail?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Anonymous submissions cannot include contactEmail",
          path: ["contactEmail"],
        });
      }
    }
  });

export type PublicRequestCreate = z.infer<typeof publicRequestCreateSchema>;

export const publicRequestCommentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  recoveryToken: z.string().trim().min(8).max(128).nullable().optional(),
});

export type PublicRequestComment = z.infer<typeof publicRequestCommentSchema>;
