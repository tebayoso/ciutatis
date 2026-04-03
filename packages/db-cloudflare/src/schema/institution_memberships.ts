import { sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { institutions } from "./institutions.js";

export const institutionMemberships = sqliteTable(
  "company_memberships",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id").notNull().references(() => institutions.id),
    principalType: text("principal_type").notNull(),
    principalId: text("principal_id").notNull(),
    status: text("status").notNull().default("active"),
    membershipRole: text("membership_role"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    companyPrincipalUniqueIdx: uniqueIndex("company_memberships_company_principal_unique_idx").on(
      table.companyId,
      table.principalType,
      table.principalId,
    ),
    principalStatusIdx: index("company_memberships_principal_status_idx").on(
      table.principalType,
      table.principalId,
      table.status,
    ),
    companyStatusIdx: index("company_memberships_company_status_idx").on(table.companyId, table.status),
  }),
);

// Backward-compat alias
export const companyMemberships = institutionMemberships;
