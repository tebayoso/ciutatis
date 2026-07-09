import { and, asc, eq, inArray, like, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { geoEntities } from "@ciutatis/db-cloudflare";
import type { PublicGeoChildrenPage, PublicGeoEntity, PublicGeoEntityDetail } from "@paperclipai/shared";
import { searchNominatim, type NominatimResult } from "./public-portal.js";

// Level weight for ranking: broader entities first on ties.
const LEVEL_WEIGHT = sql`CASE ${geoEntities.level}
  WHEN 'provincia' THEN 0 WHEN 'municipio' THEN 1
  WHEN 'departamento' THEN 2 WHEN 'localidad' THEN 3 ELSE 4 END`;

function normalizeQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// Nominatim ranks sub-entities above admin areas for ambiguous names
// ("Buenos Aires" → a CABA barrio before the province), so results[0] is not
// safe. Pick by expected admin context instead.
function pickNominatimMatch(
  results: NominatimResult[],
  row: { level: string; name: string; provinceName?: string | null },
): NominatimResult | undefined {
  const admin = results.filter((r) => r.type === "administrative" || r.class === "boundary");
  const pool = admin.length > 0 ? admin : results;
  if (row.level === "provincia") {
    return (
      pool.find((r) => {
        const addr = r.address ?? {};
        return (
          normalizeQuery(addr.state ?? "") === normalizeQuery(row.name) &&
          !addr.city && !addr.town && !addr.municipality && !addr.state_district && !addr.county
        );
      }) ?? pool[0]
    );
  }
  const wantState = row.provinceName ? normalizeQuery(row.provinceName) : null;
  if (wantState) {
    const stateMatch = pool.find((r) => normalizeQuery(r.address?.state ?? "") === wantState);
    if (stateMatch) return stateMatch;
  }
  return pool[0];
}

export function publicGeoService(db: any) {
  const province = alias(geoEntities, "province");
  const parent = alias(geoEntities, "parent");

  const summarySelection = {
    id: geoEntities.id,
    countryCode: geoEntities.countryCode,
    level: geoEntities.level,
    jurisdictionType: geoEntities.jurisdictionType,
    name: geoEntities.name,
    slug: geoEntities.slug,
    pathPrefix: geoEntities.pathPrefix,
    parentId: geoEntities.parentId,
    provinceName: province.name,
    parentName: parent.name,
    lat: geoEntities.lat,
    lon: geoEntities.lon,
    osmType: geoEntities.osmType,
    osmId: geoEntities.osmId,
    tenantInstanceId: geoEntities.tenantInstanceId,
    category: geoEntities.category,
  };

  function toEntity(row: any): PublicGeoEntity {
    return {
      id: row.id,
      countryCode: row.countryCode,
      level: row.level,
      jurisdictionType: row.jurisdictionType,
      name: row.name,
      slug: row.slug,
      pathPrefix: row.pathPrefix,
      parentId: row.parentId ?? null,
      provinceName: row.provinceName ?? null,
      parentName: row.parentName ?? null,
      lat: row.lat ?? null,
      lon: row.lon ?? null,
      osmType: row.osmType ?? null,
      osmId: row.osmId ?? null,
      claimed: Boolean(row.tenantInstanceId),
      category: row.category ?? null,
    };
  }

  function baseSelect() {
    return db
      .select(summarySelection)
      .from(geoEntities)
      .leftJoin(province, eq(province.id, geoEntities.provinceId))
      .leftJoin(parent, eq(parent.id, geoEntities.parentId));
  }

  async function search(input: {
    q: string;
    country?: string;
    levels?: string[];
    max?: number;
  }): Promise<PublicGeoEntity[]> {
    const q = normalizeQuery(input.q);
    if (!q) return [];
    const max = Math.min(Math.max(input.max ?? 20, 1), 100);
    const conditions = [eq(geoEntities.countryCode, input.country ?? "ar"), like(geoEntities.searchName, `%${q}%`)];
    if (input.levels?.length) {
      conditions.push(inArray(geoEntities.level, input.levels));
    }
    const rows = await baseSelect()
      .where(and(...conditions))
      .orderBy(
        sql`CASE WHEN ${geoEntities.searchName} = ${q} THEN 0
             WHEN ${geoEntities.searchName} LIKE ${q + "%"} THEN 1 ELSE 2 END`,
        LEVEL_WEIGHT,
        sql`CASE WHEN ${geoEntities.tenantInstanceId} IS NULL THEN 1 ELSE 0 END`,
        asc(geoEntities.name),
      )
      .limit(max);
    return rows.map(toEntity);
  }

  async function getByPath(path: string): Promise<PublicGeoEntityDetail | null> {
    const rows = await baseSelect().where(eq(geoEntities.pathPrefix, path)).limit(1);
    const row = rows[0];
    if (!row) return null;

    // Lazy OSM backfill (same pattern as tenant places): one cached Nominatim
    // search on first view; provinces/municipios resolve by "name, province".
    if (row.level !== "pais" && (row.osmId == null || row.lat == null)) {
      // Provinces reference themselves as province — don't double the name.
      const provinceContext = row.level === "provincia" ? null : row.provinceName;
      const context = [row.name, provinceContext, "Argentina"].filter(Boolean).join(", ");
      const match = pickNominatimMatch(await searchNominatim(context, row.countryCode), row);
      const lat = match ? Number(match.lat) : NaN;
      const lon = match ? Number(match.lon) : NaN;
      if (match && Number.isFinite(lat) && Number.isFinite(lon)) {
        row.osmType = match.osm_type ?? row.osmType;
        row.osmId = match.osm_id != null ? String(match.osm_id) : row.osmId;
        if (row.lat == null) {
          row.lat = lat;
          row.lon = lon;
        }
        await db
          .update(geoEntities)
          .set({ osmType: row.osmType, osmId: row.osmId, lat: row.lat, lon: row.lon })
          .where(eq(geoEntities.id, row.id));
      }
    }

    // Parent chain, walking up (≤4 hops), returned outermost first.
    const parents: PublicGeoEntity[] = [];
    let cursorId: string | null = row.parentId ?? null;
    while (cursorId && parents.length < 6) {
      const parentRows = await baseSelect().where(eq(geoEntities.id, cursorId)).limit(1);
      const parentRow = parentRows[0];
      if (!parentRow) break;
      parents.unshift(toEntity(parentRow));
      cursorId = parentRow.parentId ?? null;
    }

    const countRows = await db
      .select({ n: sql<number>`COUNT(*)` })
      .from(geoEntities)
      .where(eq(geoEntities.parentId, row.id));

    return { ...toEntity(row), parents, childCount: Number(countRows[0]?.n ?? 0) };
  }

  async function children(input: {
    id: string;
    level?: string;
    offset?: number;
    max?: number;
  }): Promise<PublicGeoChildrenPage> {
    const max = Math.min(Math.max(input.max ?? 100, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);
    const conditions = [eq(geoEntities.parentId, input.id)];
    if (input.level) conditions.push(eq(geoEntities.level, input.level));
    const where = and(...conditions);

    const countRows = await db.select({ n: sql<number>`COUNT(*)` }).from(geoEntities).where(where);
    const rows = await baseSelect()
      .where(where)
      .orderBy(
        LEVEL_WEIGHT,
        sql`CASE WHEN ${geoEntities.tenantInstanceId} IS NULL THEN 1 ELSE 0 END`,
        asc(geoEntities.name),
      )
      .limit(max)
      .offset(offset);

    return { total: Number(countRows[0]?.n ?? 0), offset, items: rows.map(toEntity) };
  }

  return { search, getByPath, children };
}
