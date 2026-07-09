// Geo helpers for the public maps: boundary lookups through the Ciutatis
// Nominatim proxy and mapping of search results / places onto map markers.
// Server-safe (no Leaflet import) so types can be shared with client code.

import type { GeoEntity, NominatimResult, PlaceResult, RegionSearchResult } from "./public-search";

export type CivicMapMarker = {
  id: string;
  kind: "place" | "osm";
  name: string;
  subtitle?: string;
  lat: number;
  lon: number;
  href?: string;
};

// Boundary polygon + canonical point for an OSM entity, via the API proxy
// (/api/public/nominatim/lookup requests polygon_geojson upstream).
export async function lookupOsmBoundary(osmType: string, osmId: string | number): Promise<NominatimResult | null> {
  try {
    const params = new URLSearchParams({ osm_type: String(osmType), osm_id: String(osmId) });
    const response = await fetch(`/api/public/nominatim/lookup?${params.toString()}`);
    if (!response.ok) return null;
    return (await response.json()) as NominatimResult;
  } catch {
    return null;
  }
}

export function markerFromPlace(place: PlaceResult): CivicMapMarker | null {
  if (place.latitude == null || place.longitude == null) return null;
  return {
    id: `place:${place.id}`,
    kind: "place",
    name: place.name,
    subtitle: [place.jurisdictionLabel, place.parentSubdivisionName, place.countryName ?? place.countryCode.toUpperCase()]
      .filter(Boolean)
      .join(" · "),
    lat: place.latitude,
    lon: place.longitude,
    href: place.url,
  };
}

export function markerFromNominatim(result: NominatimResult): CivicMapMarker | null {
  const lat = Number(result.lat);
  const lon = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    id: `osm:${result.osm_type}-${result.osm_id}`,
    kind: "osm",
    name: result.display_name.split(",")[0]?.trim() ?? result.display_name,
    subtitle: result.display_name,
    lat,
    lon,
  };
}

export function markerFromGeoEntity(entity: GeoEntity): CivicMapMarker | null {
  if (entity.lat == null || entity.lon == null) return null;
  return {
    id: `geo:${entity.id}`,
    // Claimed entities render with the "in Ciutatis" accent dot.
    kind: entity.claimed ? "place" : "osm",
    name: entity.name,
    subtitle: [entity.jurisdictionType, entity.provinceName, "Argentina"].filter(Boolean).join(" · "),
    lat: entity.lat,
    lon: entity.lon,
    href: entity.pathPrefix,
  };
}

// Markers for the explorer: geo index entities, Ciutatis places (with stored
// coordinates), and OSM fallback candidates.
export function markersFromRegionResults(results: RegionSearchResult[]): CivicMapMarker[] {
  const markers: CivicMapMarker[] = [];
  for (const result of results) {
    const marker =
      result.kind === "place"
        ? markerFromPlace(result.place)
        : result.kind === "geo"
          ? markerFromGeoEntity(result.entity)
          : markerFromNominatim(result.result);
    if (marker) markers.push(marker);
  }
  return markers;
}

// Stable marker id for a search result, so lists and the map can stay in sync.
export function regionResultMarkerId(result: RegionSearchResult): string {
  if (result.kind === "place") return `place:${result.place.id}`;
  if (result.kind === "geo") return `geo:${result.entity.id}`;
  return `osm:${result.result.osm_type}-${result.result.osm_id}`;
}
