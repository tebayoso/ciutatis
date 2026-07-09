CREATE TABLE geo_entities (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  level TEXT NOT NULL,
  jurisdiction_type TEXT NOT NULL,
  name TEXT NOT NULL,
  search_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  path_prefix TEXT NOT NULL,
  parent_id TEXT,
  province_id TEXT,
  lat REAL,
  lon REAL,
  osm_type TEXT,
  osm_id TEXT,
  tenant_instance_id TEXT,
  category TEXT,
  source TEXT NOT NULL DEFAULT 'georef',
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX geo_entities_path_prefix_idx ON geo_entities (path_prefix);
--> statement-breakpoint
CREATE INDEX geo_entities_search_idx ON geo_entities (country_code, search_name);
--> statement-breakpoint
CREATE INDEX geo_entities_parent_idx ON geo_entities (parent_id);
--> statement-breakpoint
CREATE INDEX geo_entities_level_idx ON geo_entities (country_code, level);
--> statement-breakpoint
ALTER TABLE tenant_instances ADD COLUMN geo_id TEXT;
