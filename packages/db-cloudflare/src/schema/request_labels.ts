import { sqliteTable, text, index, primaryKey } from "drizzle-orm/sqlite-core";
import { institutions } from "./institutions.js";
import { requests } from "./requests.js";
import { labels } from "./labels.js";

export const requestLabels = sqliteTable(
  "issue_labels",
  {
    issueId: text("issue_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    labelId: text("label_id").notNull().references(() => labels.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.issueId, table.labelId], name: "issue_labels_pk" }),
    issueIdx: index("issue_labels_issue_idx").on(table.issueId),
    labelIdx: index("issue_labels_label_idx").on(table.labelId),
    companyIdx: index("issue_labels_company_idx").on(table.companyId),
  }),
);

export const issueLabels = requestLabels;
