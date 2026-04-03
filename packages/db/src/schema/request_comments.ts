import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { institutions } from "./institutions.js";
import { requests } from "./requests.js";
import { agents } from "./agents.js";

export const requestComments = pgTable(
  "issue_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => institutions.id),
    issueId: uuid("issue_id").notNull().references(() => requests.id),
    authorAgentId: uuid("author_agent_id").references(() => agents.id),
    authorUserId: text("author_user_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    issueIdx: index("issue_comments_issue_idx").on(table.issueId),
    companyIdx: index("issue_comments_company_idx").on(table.companyId),
    companyIssueCreatedAtIdx: index("issue_comments_company_issue_created_at_idx").on(
      table.companyId,
      table.issueId,
      table.createdAt,
    ),
    companyAuthorIssueCreatedAtIdx: index("issue_comments_company_author_issue_created_at_idx").on(
      table.companyId,
      table.authorUserId,
      table.issueId,
      table.createdAt,
    ),
  }),
);

export const issueComments = requestComments;
