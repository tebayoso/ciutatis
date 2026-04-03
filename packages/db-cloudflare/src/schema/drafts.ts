import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { institutions } from "./institutions.js";

export const emailDraftStatus = ["draft", "sent", "scheduled"] as const;

export const emailDrafts = sqliteTable(
  "email_drafts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id").notNull().references(() => institutions.id),
    userId: text("user_id").notNull(),
    subject: text("subject").notNull(),
    contentHtml: text("content_html"),
    contentText: text("content_text"),
    recipients: text("recipients", { mode: "json" }).$type<Array<{ email: string; name?: string | null }>>(),
    templateId: text("template_id"),
    status: text("status").$type<(typeof emailDraftStatus)[number]>().notNull().default("draft"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
    deletedAt: text("deleted_at"),
  },
  (table) => ({
    companyStatusIdx: index("email_drafts_company_status_idx").on(table.companyId, table.status),
    companyDeletedIdx: index("email_drafts_company_deleted_idx").on(table.companyId, table.deletedAt),
  }),
);
