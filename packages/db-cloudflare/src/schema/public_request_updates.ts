import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { institutions } from "./institutions.js";
import { publicRequests } from "./public_requests.js";
import { requests } from "./requests.js";

export const publicRequestUpdates = sqliteTable(
  "public_request_updates",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    publicRequestId: text("public_request_id").notNull().references(() => publicRequests.id, { onDelete: "cascade" }),
    issueId: text("issue_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("system"),
    actorLabel: text("actor_label").notNull(),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    publicRequestIdx: index("public_request_updates_public_request_idx").on(table.publicRequestId, table.createdAt),
    issueIdx: index("public_request_updates_issue_idx").on(table.issueId),
  }),
);
