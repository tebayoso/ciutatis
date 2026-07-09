// Shared types + fetchers for the public search surfaces. Single source of
// truth for /api/public/search result shapes and the Nominatim merge logic,
// consumed by both the scrutiny search (PublicApp) and the region pages.

export interface InstitutionResult {
  kind: "institution";
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brandColor: string | null;
  logoUrl: string | null;
  issuePrefix: string;
}

export interface PlaceResult {
  kind: "place";
  id: string;
  name: string;
  municipalityName: string;
  countryCode: string;
  countryName: string | null;
  jurisdictionType: string;
  jurisdictionLabel: string;
  postalCode: string | null;
  citySlug: string;
  parentSubdivisionName: string | null;
  pathPrefix: string;
  url: string;
  // Geo anchor from OSM; null for places created before capture.
  latitude: number | null;
  longitude: number | null;
  osmType: string | null;
  osmId: string | null;
}

export type PublicSearchResult = InstitutionResult | PlaceResult;

export type NominatimResult = {
  place_id: number;
  osm_type: string;
  osm_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address?: {
    city?: string;
    town?: string;
    municipality?: string;
    county?: string;
    state_district?: string;
    state?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
  extratags?: {
    population?: string;
    area?: string;
    wikidata?: string;
    wikipedia?: string;
  };
  // Boundary geometry (GeoJSON), present on /nominatim/lookup responses.
  geojson?: unknown;
};

// Canonical administrative entity from /api/public/geo/* (geo_entities layer).
export interface GeoEntity {
  id: string;
  countryCode: string;
  level: string; // pais | provincia | departamento | municipio | localidad
  jurisdictionType: string;
  name: string;
  slug: string;
  pathPrefix: string;
  parentId: string | null;
  provinceName: string | null;
  parentName: string | null;
  lat: number | null;
  lon: number | null;
  osmType: string | null;
  osmId: string | null;
  claimed: boolean;
  category: string | null;
}

export interface GeoEntityDetail extends GeoEntity {
  parents: GeoEntity[]; // outermost first
  childCount: number;
}

export interface GeoChildrenPage {
  total: number;
  offset: number;
  items: GeoEntity[];
}

export type RegionSearchResult =
  | { kind: "place"; place: PlaceResult }
  | { kind: "geo"; entity: GeoEntity }
  | { kind: "nominatim"; result: NominatimResult };

// Institutions + places from the Ciutatis index. An empty query returns the
// default listing. Throws on a non-OK response.
export async function searchPublic(query: string, options?: { signal?: AbortSignal }): Promise<PublicSearchResult[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  const response = await fetch(`/api/public/search${params.size ? `?${params.toString()}` : ""}`, {
    signal: options?.signal,
  });
  if (!response.ok) throw new Error("Public search failed");
  return (await response.json()) as PublicSearchResult[];
}

export type ExplorerResults = {
  institutions: InstitutionResult[];
  places: RegionSearchResult[];
};

// Explorer search, backed by the canonical geo index: institutions from the
// Ciutatis search plus admin entities from /geo/search (accent-insensitive,
// ranked, no rate limits). Nominatim is only a fallback for queries the geo
// index can't answer (non-Argentine places). An empty query enters browse
// mode: Argentina's provinces plus the default institution listing.
export async function searchExplorer(query: string): Promise<ExplorerResults> {
  const q = query.trim();

  const [ciutatisResponse, geoResponse] = await Promise.all([
    fetch(`/api/public/search${q ? `?q=${encodeURIComponent(q)}` : ""}`).catch(() => null),
    q
      ? fetch(`/api/public/geo/search?q=${encodeURIComponent(q)}&max=20`).catch(() => null)
      : fetch(`/api/public/geo/children?id=ar:00`).catch(() => null),
  ]);

  const institutions: InstitutionResult[] = [];
  const places: RegionSearchResult[] = [];

  if (ciutatisResponse?.ok) {
    const ciutatisData = (await ciutatisResponse.json()) as PublicSearchResult[];
    for (const item of ciutatisData) {
      if (item.kind === "institution") institutions.push(item);
      // Claimed places surface through the geo index (claimed flag) — the
      // legacy place results are skipped to avoid duplicates.
    }
  }

  if (geoResponse?.ok) {
    const geoData = (await geoResponse.json()) as GeoEntity[] | GeoChildrenPage;
    const entities = Array.isArray(geoData) ? geoData : geoData.items;
    for (const entity of entities) places.push({ kind: "geo", entity });
  }

  // Fallback for queries outside the geo index (e.g. non-AR places): OSM.
  if (q && places.length === 0) {
    const nominatimResponse = await fetch(`/api/public/nominatim/search?q=${encodeURIComponent(q)}`).catch(() => null);
    if (nominatimResponse?.ok) {
      const nominatimData = (await nominatimResponse.json()) as NominatimResult[];
      for (const item of nominatimData) places.push({ kind: "nominatim", result: item });
    }
  }

  return { institutions, places };
}

// Entity detail (parents chain + child count); triggers the server-side OSM
// backfill, so a follow-up boundary lookup has osm ids to work with.
export async function fetchGeoByPath(path: string): Promise<GeoEntityDetail | null> {
  try {
    const response = await fetch(`/api/public/geo/by-path?path=${encodeURIComponent(path)}`);
    if (!response.ok) return null;
    return (await response.json()) as GeoEntityDetail;
  } catch {
    return null;
  }
}

export async function fetchGeoChildren(
  id: string,
  options?: { level?: string; offset?: number; max?: number }
): Promise<GeoChildrenPage | null> {
  try {
    const params = new URLSearchParams({ id });
    if (options?.level) params.set("level", options.level);
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.max) params.set("max", String(options.max));
    const response = await fetch(`/api/public/geo/children?${params.toString()}`);
    if (!response.ok) return null;
    return (await response.json()) as GeoChildrenPage;
  } catch {
    return null;
  }
}

// Region discovery (places only) — the region pages' search.
export async function searchRegionPlaces(query: string): Promise<RegionSearchResult[]> {
  if (!query.trim()) return [];
  return (await searchExplorer(query)).places;
}

// Claim an OSM admin boundary as a Ciutatis place (draft tenant instance).
export async function createPlaceFromOsm(
  nominatimResult: NominatimResult
): Promise<{ ok: true; place: PlaceResult } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/public/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nominatimResult),
    });
    if (response.ok) {
      return { ok: true, place: (await response.json()) as PlaceResult };
    }
    const error = await response.json().catch(() => ({ error: "Failed to create place" }));
    return { ok: false, error: (error as { error?: string }).error ?? "Failed to create place" };
  } catch {
    return { ok: false, error: "Failed to create place" };
  }
}

// Best-effort enrichment of a known place from OpenStreetMap (population,
// coordinates, wiki links). Returns null when Nominatim has nothing.
export async function fetchNominatimEnrichment(
  name: string,
  country: string,
  locale: "en" | "es"
): Promise<NominatimResult | null> {
  try {
    const q = `${name}, ${country}`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&extratags=1&limit=1`,
      { headers: { "Accept-Language": locale === "es" ? "es" : "en" } }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as NominatimResult[];
    return data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}
