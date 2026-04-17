import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { PluginCategory, PluginStatus, CiutatisPluginManifestV1 } from "@paperclipai/shared";

/**
 * `plugins` table — stores one row per installed plugin.
 *
 * Each plugin is uniquely identified by `plugin_key` (derived from
 * the manifest `id`). The full manifest is persisted as JSON in
 * `manifest_json` so the host can reconstruct capability and UI
 * slot information without loading the plugin package.
 *
 * @see PLUGIN_SPEC.md §21.3
 */
export const plugins = sqliteTable(
  "plugins",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    pluginKey: text("plugin_key").notNull(),
    packageName: text("package_name").notNull(),
    version: text("version").notNull(),
    apiVersion: integer("api_version").notNull().default(1),
    categories: text("categories", { mode: "json" }).$type<PluginCategory[]>().notNull().default([]),
    manifestJson: text("manifest_json", { mode: "json" }).$type<CiutatisPluginManifestV1>().notNull(),
    status: text("status").$type<PluginStatus>().notNull().default("installed"),
    installOrder: integer("install_order"),
    /** Resolved package path for local-path installs; used to find worker entrypoint. */
    packagePath: text("package_path"),
    lastError: text("last_error"),
    installedAt: text("installed_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    pluginKeyIdx: uniqueIndex("plugins_plugin_key_idx").on(table.pluginKey),
    statusIdx: index("plugins_status_idx").on(table.status),
  }),
);
