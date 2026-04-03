import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

export const tenantInstances = pgTable(
  "tenant_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    municipalityName: text("municipality_name").notNull(),
    countryCode: text("country_code").notNull(),
    citySlug: text("city_slug").notNull(),
    shortCode: text("short_code").notNull(),
    routingMode: text("routing_mode").notNull().default("path"),
    status: text("status").notNull().default("draft"),
    pathPrefix: text("path_prefix").notNull(),
    hostname: text("hostname"),
    workerName: text("worker_name").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pathPrefixIdx: uniqueIndex("tenant_instances_path_prefix_idx").on(table.pathPrefix),
    hostnameIdx: uniqueIndex("tenant_instances_hostname_idx").on(table.hostname),
    workerNameIdx: uniqueIndex("tenant_instances_worker_name_idx").on(table.workerName),
  }),
);
