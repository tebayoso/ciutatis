import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { institutions } from "./institutions.js";
import { requests } from "./requests.js";
import { documents } from "./documents.js";

export const requestDocuments = sqliteTable(
  "issue_documents",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id").notNull().references(() => institutions.id),
    issueId: text("issue_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    companyIssueKeyUq: uniqueIndex("issue_documents_company_issue_key_uq").on(
      table.companyId,
      table.issueId,
      table.key,
    ),
    documentUq: uniqueIndex("issue_documents_document_uq").on(table.documentId),
    companyIssueUpdatedIdx: index("issue_documents_company_issue_updated_idx").on(
      table.companyId,
      table.issueId,
      table.updatedAt,
    ),
  }),
);

export const issueDocuments = requestDocuments;
