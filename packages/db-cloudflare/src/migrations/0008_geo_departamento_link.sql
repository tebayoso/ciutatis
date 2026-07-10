ALTER TABLE geo_entities ADD COLUMN departamento_id TEXT;
--> statement-breakpoint
CREATE INDEX geo_entities_departamento_idx ON geo_entities (departamento_id);
