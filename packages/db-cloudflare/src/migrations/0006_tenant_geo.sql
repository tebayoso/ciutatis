-- Geo anchor for places: coordinates + OSM identity captured from Nominatim
-- at creation time so maps don't have to re-geocode.
ALTER TABLE `tenant_instances` ADD COLUMN `latitude` real;--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `longitude` real;--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `osm_type` text;--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `osm_id` text;
