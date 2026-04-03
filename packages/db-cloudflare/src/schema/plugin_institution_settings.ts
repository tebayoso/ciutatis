import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { institutions } from "./institutions.js";
import { plugins } from "./plugins.js";

export const pluginInstitutionSettings = sqliteTable(
  "plugin_company_settings",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    pluginId: text("plugin_id")
      .notNull()
      .references(() => plugins.id, { onDelete: "cascade" }),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    settingsJson: text("settings_json", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    lastError: text("last_error"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    companyIdx: index("plugin_company_settings_company_idx").on(table.companyId),
    pluginIdx: index("plugin_company_settings_plugin_idx").on(table.pluginId),
    companyPluginUq: uniqueIndex("plugin_company_settings_company_plugin_uq").on(
      table.companyId,
      table.pluginId,
    ),
  }),
);

export const pluginCompanySettings = pluginInstitutionSettings;
