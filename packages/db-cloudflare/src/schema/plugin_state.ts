import { sqliteTable, text, index, unique } from "drizzle-orm/sqlite-core";
import type { PluginStateScopeKind } from "@paperclipai/shared";
import { plugins } from "./plugins.js";

/**
 * `plugin_state` table — scoped key-value storage for plugin workers.
 *
 * Each row stores a single JSON value identified by
 * `(plugin_id, scope_kind, scope_id, namespace, state_key)`.
 *
 * @see PLUGIN_SPEC.md §21.3 — `plugin_state`
 */
export const pluginState = sqliteTable(
  "plugin_state",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** FK to the owning plugin. Cascades on delete. */
    pluginId: text("plugin_id")
      .notNull()
      .references(() => plugins.id, { onDelete: "cascade" }),
    /** Granularity of the scope (e.g. `"instance"`, `"project"`, `"issue"`). */
    scopeKind: text("scope_kind").$type<PluginStateScopeKind>().notNull(),
    /** UUID or text identifier for the scoped object. Null for `instance` scope. */
    scopeId: text("scope_id"),
    /** Sub-namespace to avoid key collisions within a scope. */
    namespace: text("namespace").notNull().default("default"),
    /** The key identifying this state entry within the namespace. */
    stateKey: text("state_key").notNull(),
    /** JSON-serializable value stored by the plugin. */
    valueJson: text("value_json", { mode: "json" }).notNull(),
    /** Timestamp of the most recent write. */
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    /**
     * Unique constraint enforces that there is at most one value per
     * (plugin, scope kind, scope id, namespace, key) tuple.
     *
     * NOTE: SQLite does not support .nullsNotDistinct() — removed from PG version.
     */
    uniqueEntry: unique("plugin_state_unique_entry_idx")
      .on(
        table.pluginId,
        table.scopeKind,
        table.scopeId,
        table.namespace,
        table.stateKey,
      ),
    /** Speed up lookups by plugin + scope kind (most common access pattern). */
    pluginScopeIdx: index("plugin_state_plugin_scope_idx").on(
      table.pluginId,
      table.scopeKind,
    ),
  }),
);
