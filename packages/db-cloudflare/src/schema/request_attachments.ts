import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { institutions } from "./institutions.js";
import { requests } from "./requests.js";
import { assets } from "./assets.js";
import { requestComments } from "./request_comments.js";

export const requestAttachments = sqliteTable(
  "issue_attachments",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id").notNull().references(() => institutions.id),
    issueId: text("issue_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
    issueCommentId: text("issue_comment_id").references(() => requestComments.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    companyIssueIdx: index("issue_attachments_company_issue_idx").on(table.companyId, table.issueId),
    issueCommentIdx: index("issue_attachments_issue_comment_idx").on(table.issueCommentId),
    assetUq: uniqueIndex("issue_attachments_asset_uq").on(table.assetId),
  }),
);

export const issueAttachments = requestAttachments;
