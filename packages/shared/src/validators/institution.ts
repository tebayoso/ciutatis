import { z } from "zod";
import { INSTITUTION_STATUSES } from "../constants.js";

const logoAssetIdSchema = z.string().uuid().nullable().optional();

export const createInstitutionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  budgetMonthlyCents: z.number().int().nonnegative().optional().default(0),
});

export type CreateInstitution = z.infer<typeof createInstitutionSchema>;

export const updateInstitutionSchema = createInstitutionSchema
  .partial()
  .extend({
    status: z.enum(INSTITUTION_STATUSES).optional(),
    spentMonthlyCents: z.number().int().nonnegative().optional(),
    requireBoardApprovalForNewAgents: z.boolean().optional(),
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
    logoAssetId: logoAssetIdSchema,
  });

export type UpdateInstitution = z.infer<typeof updateInstitutionSchema>;

// Backward-compat aliases
export const createCompanySchema = createInstitutionSchema;
export type CreateCompany = CreateInstitution;
export const updateCompanySchema = updateInstitutionSchema;
export type UpdateCompany = UpdateInstitution;
