import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Canonical administrative-entity reference layer (country topography),
// seeded from official sources (Argentina: georef / INDEC). Claimed places
// live in tenant_instances; the two link via tenantInstanceId / geo_id.
export const geoEntities = sqliteTable(
  "geo_entities",
  {
    id: text("id").primaryKey(), // "{countryCode}:{sourceId}", e.g. "ar:060798"
    countryCode: text("country_code").notNull(),
    level: text("level").notNull(), // pais | provincia | departamento | municipio | localidad
    jurisdictionType: text("jurisdiction_type").notNull(), // tenant-routing jurisdiction
    name: text("name").notNull(),
    searchName: text("search_name").notNull(), // lowercased, unaccented
    slug: text("slug").notNull(),
    pathPrefix: text("path_prefix").notNull(),
    parentId: text("parent_id"),
    provinceId: text("province_id"),
    // Containing departamento/partido for localidades. Localidades parent to
    // their municipio when one exists, so this keeps the departamento link
    // (a municipio can span departamentos — this is the localidad's own).
    departamentoId: text("departamento_id"),
    lat: real("lat"),
    lon: real("lon"),
    osmType: text("osm_type"),
    osmId: text("osm_id"),
    tenantInstanceId: text("tenant_instance_id"),
    category: text("category"),
    source: text("source").notNull().default("georef"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    pathPrefixIdx: uniqueIndex("geo_entities_path_prefix_idx").on(table.pathPrefix),
    searchIdx: index("geo_entities_search_idx").on(table.countryCode, table.searchName),
    parentIdx: index("geo_entities_parent_idx").on(table.parentId),
    levelIdx: index("geo_entities_level_idx").on(table.countryCode, table.level),
  }),
);
