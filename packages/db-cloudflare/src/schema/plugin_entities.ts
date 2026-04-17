import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { plugins } from "./plugins.js";
import type { PluginStateScopeKind } from "@paperclipai/shared";

/**
 * `plugin_entities` table — persistent high-level mapping between Ciutatis
 * objects and external plugin-defined entities.
 *
 * @see PLUGIN_SPEC.md §21.3
 */
export const pluginEntities = sqliteTable(
  "plugin_entities",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    pluginId: text("plugin_id")
      .notNull()
      .references(() => plugins.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    scopeKind: text("scope_kind").$type<PluginStateScopeKind>().notNull(),
    scopeId: text("scope_id"),
    externalId: text("external_id"),
    title: text("title"),
    status: text("status"),
    data: text("data", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    pluginIdx: index("plugin_entities_plugin_idx").on(table.pluginId),
    typeIdx: index("plugin_entities_type_idx").on(table.entityType),
    scopeIdx: index("plugin_entities_scope_idx").on(table.scopeKind, table.scopeId),
    externalIdx: uniqueIndex("plugin_entities_external_idx").on(
      table.pluginId,
      table.entityType,
      table.externalId,
    ),
  }),
);
