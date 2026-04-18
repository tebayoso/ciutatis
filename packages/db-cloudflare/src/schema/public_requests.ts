import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { institutions } from "./institutions.js";
import { requests } from "./requests.js";

export const publicRequests = sqliteTable(
  "public_requests",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    issueId: text("issue_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull(),
    institutionSlug: text("institution_slug").notNull(),
    submissionMode: text("submission_mode").notNull(),
    ownerUserId: text("owner_user_id"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    recoveryTokenHash: text("recovery_token_hash"),
    category: text("category").notNull(),
    locationLabel: text("location_label"),
    publicTitle: text("public_title").notNull(),
    publicSummary: text("public_summary").notNull(),
    publicDescription: text("public_description").notNull(),
    publicStatus: text("public_status").notNull().default("received"),
    piiDetected: integer("pii_detected", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    issueUniqueIdx: uniqueIndex("public_requests_issue_id_idx").on(table.issueId),
    publicIdUniqueIdx: uniqueIndex("public_requests_public_id_idx").on(table.publicId),
    companyStatusIdx: index("public_requests_company_status_idx").on(table.companyId, table.publicStatus),
    institutionSlugIdx: index("public_requests_institution_slug_idx").on(table.institutionSlug),
    ownerUserIdx: index("public_requests_owner_user_idx").on(table.ownerUserId),
  }),
);

