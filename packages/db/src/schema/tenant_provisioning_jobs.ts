import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type {
  TenantProvisioningJobKind,
  TenantProvisioningJobStatus,
  TenantProvisioningJobTrigger,
  TenantProvisioningStep,
} from "@paperclipai/shared";
import { tenantInstances } from "./tenant_instances.js";

export const tenantProvisioningJobs = pgTable(
  "tenant_provisioning_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantInstances.id, { onDelete: "cascade" }),
    kind: text("kind").$type<TenantProvisioningJobKind>().notNull(),
    status: text("status").$type<TenantProvisioningJobStatus>().notNull().default("queued"),
    trigger: text("trigger").$type<TenantProvisioningJobTrigger>().notNull(),
    step: text("step").$type<TenantProvisioningStep>().notNull().default("queued"),
    attempt: integer("attempt").notNull().default(1),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    details: jsonb("details").$type<Record<string, unknown> | null>().default(null),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index("tenant_provisioning_jobs_tenant_idx").on(table.tenantId),
    statusIdx: index("tenant_provisioning_jobs_status_idx").on(table.status),
    createdAtIdx: index("tenant_provisioning_jobs_created_at_idx").on(table.createdAt),
  }),
);
