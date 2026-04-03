import { pgTable, uuid, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { institutions } from "./institutions.js";
import { assets } from "./assets.js";

export const institutionLogos = pgTable(
  "company_logos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyUq: uniqueIndex("company_logos_company_uq").on(table.companyId),
    assetUq: uniqueIndex("company_logos_asset_uq").on(table.assetId),
  }),
);

// Backward-compat alias
export const companyLogos = institutionLogos;
