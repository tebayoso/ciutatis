import { z } from "zod";
import { TENANT_INSTANCE_STATUSES, TENANT_ROUTING_MODES } from "../constants.js";

const slugSchema = z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/);

export const createTenantInstanceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  municipalityName: z.string().trim().min(1).max(120),
  countryCode: z.string().trim().length(2).regex(/^[a-zA-Z]{2}$/),
  citySlug: slugSchema,
  shortCode: z.string().trim().min(3).max(12).regex(/^[a-zA-Z0-9]+$/),
  routingMode: z.enum(TENANT_ROUTING_MODES).optional().default("path"),
  hostname: z.string().trim().min(3).max(255).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateTenantInstanceSchema = createTenantInstanceSchema.partial().extend({
  status: z.enum(TENANT_INSTANCE_STATUSES).optional(),
});

export type CreateTenantInstance = z.infer<typeof createTenantInstanceSchema>;
export type UpdateTenantInstance = z.infer<typeof updateTenantInstanceSchema>;
