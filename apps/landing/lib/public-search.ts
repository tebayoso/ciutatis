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
};

export type RegionSearchResult =
  | { kind: "place"; place: PlaceResult }
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

// Region discovery: Ciutatis places merged with Nominatim admin boundaries.
// Nominatim entries whose primary name matches an existing Ciutatis place are
// dropped so "in Ciutatis" wins over "not yet in Ciutatis".
export async function searchRegionPlaces(query: string): Promise<RegionSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const [ciutatisResponse, nominatimResponse] = await Promise.all([
    fetch(`/api/public/search?q=${encodeURIComponent(q)}`).catch(() => null),
    fetch(`/api/public/nominatim/search?q=${encodeURIComponent(q)}`).catch(() => null),
  ]);

  const results: RegionSearchResult[] = [];

  if (ciutatisResponse?.ok) {
    const ciutatisData = (await ciutatisResponse.json()) as PublicSearchResult[];
    for (const item of ciutatisData) {
      if (item.kind === "place") results.push({ kind: "place", place: item });
    }
  }

  if (nominatimResponse?.ok) {
    const nominatimData = (await nominatimResponse.json()) as NominatimResult[];
    for (const item of nominatimData) {
      const alreadyExists = results.some(
        (r) => r.kind === "place" && r.place.name.toLowerCase() === item.display_name.split(",")[0]?.trim().toLowerCase()
      );
      if (!alreadyExists) results.push({ kind: "nominatim", result: item });
    }
  }

  return results;
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
