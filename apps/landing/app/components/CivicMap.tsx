"use client";

// Interactive civic map built on Leaflet + OpenStreetMap raster tiles.
// Leaflet is loaded inside an effect (never during SSR/SSG), so this component
// is safe to render from prerendered pages. Reused by the /explore page and
// the region pages; styled with the public site's design tokens.

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup, GeoJSON as LeafletGeoJSON } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CivicMapMarker } from "../../lib/geo";

type CivicMapProps = {
  center?: [number, number];
  zoom?: number;
  markers?: CivicMapMarker[];
  // GeoJSON geometry (e.g. Nominatim polygon_geojson) drawn as the admin boundary.
  boundary?: unknown | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
};

const DEFAULT_CENTER: [number, number] = [-37.32, -59.13]; // Tandil — first claimed Ciutatis
const DEFAULT_ZOOM = 11;

function markerHtml(kind: CivicMapMarker["kind"], selected: boolean): string {
  const size = selected ? 18 : 12;
  const ring = selected ? "box-shadow: 0 0 0 6px rgba(196,169,98,0.25);" : "";
  if (kind === "place") {
    return `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:var(--accent);border:2px solid #fff;${ring}"></span>`;
  }
  return `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:#fff;border:2px dashed var(--muted);${ring}"></span>`;
}

export default function CivicMap({
  center,
  zoom = DEFAULT_ZOOM,
  markers = [],
  boundary = null,
  selectedId = null,
  onSelect,
  className,
}: CivicMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const boundaryLayerRef = useRef<LeafletGeoJSON | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  // Latest sync closures, so the async Leaflet init never paints stale props.
  const syncRef = useRef<{ markers: () => void; boundary: () => void }>({ markers: () => {}, boundary: () => {} });
  syncRef.current = { markers: syncMarkers, boundary: syncBoundary };

  // Init once, client-only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        center: center ?? DEFAULT_CENTER,
        zoom,
        scrollWheelZoom: true,
        zoomControl: true,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      syncRef.current.markers();
      syncRef.current.boundary();
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      boundaryLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncMarkers() {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    for (const marker of markers) {
      const selected = marker.id === selectedId;
      const icon = L.divIcon({
        className: "civic-map-marker",
        html: markerHtml(marker.kind, selected),
        iconSize: selected ? [18, 18] : [12, 12],
        iconAnchor: selected ? [9, 9] : [6, 6],
      });
      const leafletMarker = L.marker([marker.lat, marker.lon], { icon, zIndexOffset: selected ? 1000 : 0 });
      const subtitle = marker.subtitle ? `<div style="color:#6b6b6b;font-size:11px;margin-top:2px;">${marker.subtitle}</div>` : "";
      const link = marker.href
        ? `<a href="${marker.href}" style="display:inline-block;margin-top:6px;font-size:11px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em;">Open →</a>`
        : "";
      leafletMarker.bindPopup(
        `<div style="font-family:inherit;min-width:160px;"><div style="font-weight:600;">${marker.name}</div>${subtitle}${link}</div>`,
        { closeButton: false }
      );
      leafletMarker.on("click", () => onSelectRef.current?.(marker.id));
      leafletMarker.addTo(layer);
    }
  }

  function syncBoundary() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.remove();
      boundaryLayerRef.current = null;
    }
    if (!boundary) return;
    try {
      const layer = L.geoJSON(boundary as Parameters<typeof L.geoJSON>[0], {
        style: { color: "#c4a962", weight: 2, opacity: 0.9, fillColor: "#c4a962", fillOpacity: 0.07 },
      }).addTo(map);
      boundaryLayerRef.current = layer;
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] });
    } catch {
      // Malformed geometry — leave the map without a boundary overlay.
    }
  }

  // Sync markers when data or selection changes.
  useEffect(() => {
    syncMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, selectedId]);

  // Sync boundary; fit bounds when it changes.
  useEffect(() => {
    syncBoundary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundary]);

  // Recenter when the caller moves the focus point (no boundary case).
  useEffect(() => {
    if (!mapRef.current || !center) return;
    if (boundary) return; // boundary fit wins
    mapRef.current.setView(center, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1]]);

  // Fit to markers when there's no boundary and no explicit center.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || boundary || center || markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lon] as [number, number]));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, boundary, center]);

  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--panel)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          Civic map
        </div>
        <span className="text-xs font-medium text-[var(--muted-strong)]">OpenStreetMap</span>
      </div>
      <div ref={containerRef} className="min-h-[400px] w-full flex-1" role="application" aria-label="Civic map" />
    </div>
  );
}
