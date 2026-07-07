import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";

// A citizen's contributed document (via the public Collaborate intake). The
// document itself lives in Superparser; this row links it to the contributing
// user so they can see their own contribution history. Anonymous uploads do not
// create a row.
export const publicContributions = sqliteTable(
  "public_contributions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    contentHash: text("content_hash").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type"),
    // "duplicate" (already aggregated) or "ingested" (newly parsed).
    status: text("status").notNull(),
    documentId: text("document_id"),
    classificationLabel: text("classification_label"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    userCreatedIdx: index("public_contributions_user_created_idx").on(table.userId, table.createdAt),
  }),
);
