import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { institutions } from "./institutions.js";
import { requests } from "./requests.js";

export const requestReadStates = sqliteTable(
  "issue_read_states",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id").notNull().references(() => institutions.id),
    issueId: text("issue_id").notNull().references(() => requests.id),
    userId: text("user_id").notNull(),
    lastReadAt: text("last_read_at").notNull().$defaultFn(() => new Date().toISOString()),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    companyIssueIdx: index("issue_read_states_company_issue_idx").on(table.companyId, table.issueId),
    companyUserIdx: index("issue_read_states_company_user_idx").on(table.companyId, table.userId),
    companyIssueUserUnique: uniqueIndex("issue_read_states_company_issue_user_idx").on(
      table.companyId,
      table.issueId,
      table.userId,
    ),
  }),
);

export const issueReadStates = requestReadStates;
