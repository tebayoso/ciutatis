import {
  type AnyPgColumn,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { institutions } from "./institutions.js";

export const objectives = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => institutions.id),
    title: text("title").notNull(),
    description: text("description"),
    level: text("level").notNull().default("task"),
    status: text("status").notNull().default("planned"),
    parentId: uuid("parent_id").references((): AnyPgColumn => objectives.id),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("goals_company_idx").on(table.companyId),
  }),
);

// Backward-compat alias
export const goals = objectives;
