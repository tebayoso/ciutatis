import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type {
  TenantProvisioningJobKind,
  TenantProvisioningJobStatus,
  TenantProvisioningJobTrigger,
  TenantProvisioningStep,
} from "@paperclipai/shared";
import { tenantInstances } from "./tenant_instances.js";

export const tenantProvisioningJobs = sqliteTable(
  "tenant_provisioning_jobs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenantInstances.id, { onDelete: "cascade" }),
    kind: text("kind").$type<TenantProvisioningJobKind>().notNull(),
    status: text("status").$type<TenantProvisioningJobStatus>().notNull().default("queued"),
    trigger: text("trigger").$type<TenantProvisioningJobTrigger>().notNull(),
    step: text("step").$type<TenantProvisioningStep>().notNull().default("queued"),
    attempt: integer("attempt").notNull().default(1),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    details: text("details", { mode: "json" }).$type<Record<string, unknown> | null>().default(null),
    startedAt: text("started_at"),
    finishedAt: text("finished_at"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    tenantIdx: index("tenant_provisioning_jobs_tenant_idx").on(table.tenantId),
    statusIdx: index("tenant_provisioning_jobs_status_idx").on(table.status),
    createdAtIdx: index("tenant_provisioning_jobs_created_at_idx").on(table.createdAt),
  }),
);
