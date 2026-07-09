UPDATE geo_entities SET tenant_instance_id = (
  SELECT ti.id FROM tenant_instances ti
  WHERE ti.country_code = geo_entities.country_code
    AND lower(ti.city_slug) = geo_entities.slug
    AND geo_entities.level = 'municipio'
) WHERE level = 'municipio' AND tenant_instance_id IS NULL;
UPDATE geo_entities SET path_prefix = (
  SELECT ti.path_prefix FROM tenant_instances ti WHERE ti.id = geo_entities.tenant_instance_id
) WHERE tenant_instance_id IS NOT NULL;
UPDATE tenant_instances SET geo_id = (
  SELECT g.id FROM geo_entities g WHERE g.tenant_instance_id = tenant_instances.id
) WHERE geo_id IS NULL;