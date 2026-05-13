ALTER TABLE `tenant_instances` ADD COLUMN `jurisdiction_type` text NOT NULL DEFAULT 'municipio';
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `postal_code` text;
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `parent_subdivision_code` text;
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `parent_subdivision_name` text;
--> statement-breakpoint
CREATE INDEX `tenant_instances_jurisdiction_route_idx` ON `tenant_instances` (`country_code`, `jurisdiction_type`, `postal_code`, `city_slug`);
--> statement-breakpoint
UPDATE `instance_settings`
SET `tenant_provisioning` = json_set(
  COALESCE(NULLIF(`tenant_provisioning`, ''), '{}'),
  '$.baseDomain',
  COALESCE(json_extract(`tenant_provisioning`, '$.baseDomain'), 'ciutatis.com'),
  '$.pathTemplate',
  '/{countryCode}/{jurisdictionType}/{routeSegment}',
  '$.workerNameTemplate',
  'ciutatis-{countryCode}-{jurisdictionType}-{routeSegment}',
  '$.defaultRoutingMode',
  COALESCE(json_extract(`tenant_provisioning`, '$.defaultRoutingMode'), 'path')
)
WHERE `singleton_key` = 'default'
  AND (
    COALESCE(NULLIF(`tenant_provisioning`, ''), '{}') = '{}'
    OR json_extract(`tenant_provisioning`, '$.pathTemplate') IS NULL
    OR json_extract(`tenant_provisioning`, '$.pathTemplate') = '/{countryCode}/{citySlug}-{shortCode}'
  );
--> statement-breakpoint
UPDATE `tenant_instances`
SET
  `name` = 'Tandil City',
  `municipality_name` = 'Municipio de Tandil',
  `jurisdiction_type` = 'municipio',
  `postal_code` = '7000',
  `short_code` = '7000',
  `parent_subdivision_code` = 'buenos-aires',
  `parent_subdivision_name` = 'Provincia de Buenos Aires',
  `path_prefix` = '/ar/municipio/7000-tandil',
  `dispatcher_key` = 'ar/municipio/7000-tandil',
  `worker_name` = 'ciutatis-ar-municipio-7000-tandil',
  `dispatch_script_name` = 'ciutatis-tenant-ar-municipio-7000-tandil',
  `updated_at` = datetime('now')
WHERE `country_code` = 'ar'
  AND `city_slug` = 'tandil'
  AND `path_prefix` <> '/ar/municipio/7000-tandil'
  AND NOT EXISTS (
    SELECT 1 FROM `tenant_instances` AS `existing`
    WHERE `existing`.`path_prefix` = '/ar/municipio/7000-tandil'
  );
--> statement-breakpoint
INSERT INTO `tenant_instances` (
  `id`,
  `name`,
  `municipality_name`,
  `country_code`,
  `jurisdiction_type`,
  `postal_code`,
  `city_slug`,
  `short_code`,
  `parent_subdivision_code`,
  `parent_subdivision_name`,
  `routing_mode`,
  `status`,
  `path_prefix`,
  `dispatcher_key`,
  `worker_name`,
  `dispatch_script_name`,
  `bootstrap_status`,
  `last_deployment_started_at`,
  `last_deployment_finished_at`,
  `notes`,
  `created_at`,
  `updated_at`
)
SELECT
  'da100700-4f2a-4b7b-9000-000000007000',
  'Tandil City',
  'Municipio de Tandil',
  'ar',
  'municipio',
  '7000',
  'tandil',
  '7000',
  'buenos-aires',
  'Provincia de Buenos Aires',
  'path',
  'active',
  '/ar/municipio/7000-tandil',
  'ar/municipio/7000-tandil',
  'ciutatis-ar-municipio-7000-tandil',
  'ciutatis-tenant-ar-municipio-7000-tandil',
  'pending',
  datetime('now'),
  datetime('now'),
  'Argentina launch tenant seeded from jurisdiction routing config.',
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM `tenant_instances`
  WHERE `path_prefix` = '/ar/municipio/7000-tandil'
    OR `id` = 'da100700-4f2a-4b7b-9000-000000007000'
);
