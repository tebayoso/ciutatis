import { z } from "zod";
import {
  TENANT_BOOTSTRAP_STATUSES,
  TENANT_INSTANCE_STATUSES,
  TENANT_PROVISIONING_JOB_KINDS,
  TENANT_PROVISIONING_JOB_STATUSES,
  TENANT_PROVISIONING_JOB_TRIGGERS,
  TENANT_PROVISIONING_STEPS,
  TENANT_ROUTING_MODES,
} from "../constants.js";

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

export const tenantBootstrapStatusSchema = z.enum(TENANT_BOOTSTRAP_STATUSES);

export const tenantProvisioningJobSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  kind: z.enum(TENANT_PROVISIONING_JOB_KINDS),
  status: z.enum(TENANT_PROVISIONING_JOB_STATUSES),
  trigger: z.enum(TENANT_PROVISIONING_JOB_TRIGGERS),
  step: z.enum(TENANT_PROVISIONING_STEPS),
  attempt: z.number().int().min(1),
  errorCode: z.string().trim().nullable(),
  errorMessage: z.string().trim().nullable(),
  details: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.coerce.date(),
  startedAt: z.coerce.date().nullable(),
  finishedAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date(),
}).strict();

export type CreateTenantInstance = z.infer<typeof createTenantInstanceSchema>;
export type UpdateTenantInstance = z.infer<typeof updateTenantInstanceSchema>;
export type TenantProvisioningJobInput = z.infer<typeof tenantProvisioningJobSchema>;
