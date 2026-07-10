#!/usr/bin/env node
// Seed the geo_entities reference layer for Argentina from the official
// Georef API (datos.gob.ar / INDEC). Emits chunked upsert SQL into
// packages/db-cloudflare/seeds/ so environments are reproducible without
// hitting georef at runtime. Re-runnable (INSERT OR REPLACE).
//
// Usage: node scripts/seed-geo-ar.mjs
// Then:  wrangler d1 execute ciutatis-db --file <seed> [--local|--remote]

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://apis.datos.gob.ar/georef/api";
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "db-cloudflare", "seeds");
const NOW = Date.now();
// Local D1 (miniflare) runs each file as one SQL string capped at ~100KB
// (SQLITE_TOOBIG), so files must stay well under that.
const CHUNK_ROWS = 250; // rows per seed file
const INSERT_ROWS = 15; // rows per INSERT statement

function unaccent(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function searchName(value) {
  return unaccent(value).toLowerCase().trim();
}

function slugify(value) {
  return searchName(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sqlText(value) {
  if (value == null) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNum(value) {
  if (value == null || !Number.isFinite(Number(value))) return "NULL";
  return String(Number(value));
}

async function fetchAll(resource, campos) {
  const items = [];
  let inicio = 0;
  for (;;) {
    const url = `${API}/${resource}?campos=${campos}&max=1000&inicio=${inicio}`;
    const response = await fetch(url, { headers: { "User-Agent": "ciutatis-geo-seed/1.0" } });
    if (!response.ok) throw new Error(`${resource} ${response.status} at inicio=${inicio}`);
    const data = await response.json();
    const page = data[resource];
    items.push(...page);
    inicio += page.length;
    if (inicio >= data.total || page.length === 0) {
      if (items.length !== data.total) throw new Error(`${resource}: got ${items.length}, expected ${data.total}`);
      return items;
    }
  }
}

// Jurisdiction mapping (see workfiles/argentina-geo-index-design.md §3.1)
const CABA_ID = "02";
const BUENOS_AIRES_ID = "06";

function provinciaJurisdiction(id) {
  return id === CABA_ID ? "ciudad-autonoma" : "provincia";
}

function departamentoJurisdiction(provinciaId) {
  if (provinciaId === CABA_ID) return "comuna";
  if (provinciaId === BUENOS_AIRES_ID) return "partido";
  return "departamento";
}

function row(entity) {
  return `(${[
    sqlText(entity.id),
    sqlText("ar"),
    sqlText(entity.level),
    sqlText(entity.jurisdictionType),
    sqlText(entity.name),
    sqlText(searchName(entity.name)),
    sqlText(entity.slug),
    sqlText(entity.pathPrefix),
    sqlText(entity.parentId),
    sqlText(entity.provinceId),
    sqlText(entity.departamentoId ?? null),
    sqlNum(entity.lat),
    sqlNum(entity.lon),
    sqlText("georef"),
    sqlText(entity.category ?? null),
    String(NOW),
  ].join(",")})`;
}

const COLUMNS =
  "(id, country_code, level, jurisdiction_type, name, search_name, slug, path_prefix, parent_id, province_id, departamento_id, lat, lon, source, category, updated_at)";

// Upsert that preserves runtime state on re-seed: OSM backfills, tenant links,
// and the tenant-owned path of claimed entities survive; georef fields refresh.
const ON_CONFLICT = `ON CONFLICT(id) DO UPDATE SET
  level = excluded.level,
  jurisdiction_type = excluded.jurisdiction_type,
  name = excluded.name,
  search_name = excluded.search_name,
  slug = excluded.slug,
  path_prefix = CASE WHEN geo_entities.tenant_instance_id IS NULL THEN excluded.path_prefix ELSE geo_entities.path_prefix END,
  parent_id = excluded.parent_id,
  province_id = excluded.province_id,
  departamento_id = excluded.departamento_id,
  lat = COALESCE(geo_entities.lat, excluded.lat),
  lon = COALESCE(geo_entities.lon, excluded.lon),
  category = excluded.category,
  updated_at = excluded.updated_at`;

async function main() {
  console.log("Fetching georef datasets...");
  const [provincias, departamentos, municipios, localidades] = await Promise.all([
    fetchAll("provincias", "id,nombre,centroide"),
    fetchAll("departamentos", "id,nombre,centroide,provincia"),
    fetchAll("municipios", "id,nombre,centroide,provincia"),
    fetchAll("localidades", "id,nombre,categoria,centroide,provincia,departamento,municipio"),
  ]);
  console.log(
    `provincias=${provincias.length} departamentos=${departamentos.length} municipios=${municipios.length} localidades=${localidades.length}`
  );

  const entities = [];
  entities.push({
    id: "ar:00",
    level: "pais",
    jurisdictionType: "nacion",
    name: "Argentina",
    slug: "argentina",
    pathPrefix: "/ar",
    parentId: null,
    provinceId: null,
    lat: -38.4161,
    lon: -63.6167,
  });

  for (const p of provincias) {
    const jt = provinciaJurisdiction(p.id);
    const slug = slugify(p.nombre);
    entities.push({
      id: `ar:${p.id}`,
      level: "provincia",
      jurisdictionType: jt,
      name: p.nombre,
      slug,
      pathPrefix: `/ar/${jt}/${slug}`,
      parentId: "ar:00",
      provinceId: `ar:${p.id}`,
      lat: p.centroide?.lat,
      lon: p.centroide?.lon,
    });
  }

  for (const d of departamentos) {
    const jt = departamentoJurisdiction(d.provincia.id);
    const slug = slugify(d.nombre);
    entities.push({
      id: `ar:${d.id}`,
      level: "departamento",
      jurisdictionType: jt,
      name: d.nombre,
      slug,
      pathPrefix: `/ar/${jt}/${d.id}-${slug}`,
      parentId: `ar:${d.provincia.id}`,
      provinceId: `ar:${d.provincia.id}`,
      lat: d.centroide?.lat,
      lon: d.centroide?.lon,
    });
  }

  for (const m of municipios) {
    const slug = slugify(m.nombre);
    entities.push({
      id: `ar:${m.id}`,
      level: "municipio",
      jurisdictionType: "municipio",
      name: m.nombre,
      slug,
      pathPrefix: `/ar/municipio/${m.id}-${slug}`,
      parentId: `ar:${m.provincia.id}`,
      provinceId: `ar:${m.provincia.id}`,
      lat: m.centroide?.lat,
      lon: m.centroide?.lon,
    });
  }

  const known = new Set(entities.map((e) => e.id));
  for (const l of localidades) {
    const slug = slugify(l.nombre);
    const municipioParent = l.municipio?.id && known.has(`ar:${l.municipio.id}`) ? `ar:${l.municipio.id}` : null;
    const departamentoParent =
      l.departamento?.id && known.has(`ar:${l.departamento.id}`) ? `ar:${l.departamento.id}` : null;
    entities.push({
      id: `ar:loc:${l.id}`,
      level: "localidad",
      jurisdictionType: "localidad",
      name: l.nombre,
      slug,
      pathPrefix: `/ar/localidad/${l.id}-${slug}`,
      parentId: municipioParent ?? departamentoParent ?? `ar:${l.provincia.id}`,
      provinceId: `ar:${l.provincia.id}`,
      departamentoId: departamentoParent,
      lat: l.centroide?.lat,
      lon: l.centroide?.lon,
      category: l.categoria ?? null,
    });
  }

  // Sanity: unique paths (schema enforces too, but fail fast here).
  const paths = new Set();
  for (const e of entities) {
    if (paths.has(e.pathPrefix)) throw new Error(`duplicate path: ${e.pathPrefix}`);
    paths.add(e.pathPrefix);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const files = [];
  for (let i = 0; i < entities.length; i += CHUNK_ROWS) {
    const chunk = entities.slice(i, i + CHUNK_ROWS);
    const statements = [];
    for (let j = 0; j < chunk.length; j += INSERT_ROWS) {
      const values = chunk.slice(j, j + INSERT_ROWS).map(row).join(",\n");
      statements.push(`INSERT INTO geo_entities ${COLUMNS} VALUES\n${values}\n${ON_CONFLICT};`);
    }
    const name = `geo-ar-${String(files.length).padStart(2, "0")}.sql`;
    writeFileSync(join(OUT_DIR, name), statements.join("\n"));
    files.push(name);
  }

  // Link pass: claimed tenants adopt the canonical row; the geo row adopts the
  // tenant's live path so claimed pages keep their URLs.
  const linkSql = `
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
`;
  writeFileSync(join(OUT_DIR, "geo-ar-link.sql"), linkSql.trim());
  files.push("geo-ar-link.sql");

  console.log(`Wrote ${entities.length} entities into ${files.length} seed files in packages/db-cloudflare/seeds/`);
  console.log(files.map((f) => `  ${f}`).join("\n"));
}

await main();
