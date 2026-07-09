"use client";

// Canonical entity pages for the geo reference layer (Argentina topography):
// country hub, provinces, departamentos/partidos/comunas, municipios and
// localidades. Claimed entities render through RegionPage (tenant data);
// this page covers the unclaimed reference view: breadcrumbs, map with the
// admin boundary, children navigation, and the claim call-to-action.

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, Globe2, Layers, MapPin } from "lucide-react";

import { routePath, type Locale } from "../../lib/routes";
import {
  fetchGeoByPath,
  fetchGeoChildren,
  type GeoEntity,
  type GeoEntityDetail,
} from "../../lib/public-search";
import { lookupOsmBoundary } from "../../lib/geo";
import CivicMap from "../components/CivicMap";
import RegionPage from "../region/RegionPage";

const copy = {
  en: {
    home: "Home",
    loading: "Loading civic data...",
    childrenTitle: "Inside this territory",
    loadMore: "Load more",
    openExplorer: "Open in the civic map",
    claim: "Claim this place",
    claimHint: "This territory hasn't been claimed yet. Be the first to bring it to Ciutatis.",
    inCiutatis: "In Ciutatis",
    entities: "entities",
  },
  es: {
    home: "Inicio",
    loading: "Cargando datos cívicos...",
    childrenTitle: "Dentro de este territorio",
    loadMore: "Cargar más",
    openExplorer: "Abrir en el mapa cívico",
    claim: "Reclamar este lugar",
    claimHint: "Este territorio aún no fue reclamado. Sé el primero en traerlo a Ciutatis.",
    inCiutatis: "En Ciutatis",
    entities: "entidades",
  },
};

// Region-path dispatcher: canonical geo entities render here; claimed entities
// and paths outside the geo index fall through to the legacy RegionPage.
export default function GeoRegionRouter({ locale, pathPrefix }: { locale: Locale; pathPrefix: string }) {
  const [state, setState] = useState<"loading" | "geo" | "legacy">("loading");
  const [detail, setDetail] = useState<GeoEntityDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setDetail(null);
    fetchGeoByPath(pathPrefix).then((d) => {
      if (cancelled) return;
      setDetail(d);
      setState(d && !d.claimed ? "geo" : "legacy");
    });
    return () => {
      cancelled = true;
    };
  }, [pathPrefix]);

  if (state === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-[var(--muted-strong)]">{copy[locale].loading}</p>
      </div>
    );
  }
  if (state === "geo" && detail) {
    return <GeoEntityPage locale={locale} detail={detail} />;
  }
  return <RegionPage locale={locale} pathPrefix={pathPrefix} geoDetail={detail} />;
}

function GeoEntityPage({ locale, detail }: { locale: Locale; detail: GeoEntityDetail }) {
  const t = copy[locale];
  const [boundary, setBoundary] = useState<unknown | null>(null);
  const [children, setChildren] = useState<GeoEntity[]>([]);
  const [childTotal, setChildTotal] = useState(0);
  const [loadingChildren, setLoadingChildren] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBoundary(null);
    if (detail.osmType && detail.osmId) {
      lookupOsmBoundary(detail.osmType, detail.osmId).then((lookup) => {
        if (!cancelled) setBoundary(lookup?.geojson ?? null);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [detail.osmType, detail.osmId]);

  useEffect(() => {
    let cancelled = false;
    setChildren([]);
    setChildTotal(0);
    if (detail.childCount > 0) {
      fetchGeoChildren(detail.id).then((page) => {
        if (cancelled || !page) return;
        setChildren(page.items);
        setChildTotal(page.total);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [detail.id, detail.childCount]);

  async function loadMore() {
    setLoadingChildren(true);
    const page = await fetchGeoChildren(detail.id, { offset: children.length });
    setLoadingChildren(false);
    if (page) setChildren((prev) => [...prev, ...page.items]);
  }

  const subtitle = useMemo(
    () => [...detail.parents.map((p) => p.name)].reverse().join(" · "),
    [detail.parents],
  );
  const markers = useMemo(
    () =>
      detail.lat != null && detail.lon != null
        ? [{ id: `geo:${detail.id}`, kind: "osm" as const, name: detail.name, lat: detail.lat, lon: detail.lon }]
        : [],
    [detail],
  );
  const center = useMemo<[number, number] | undefined>(
    () => (detail.lat != null && detail.lon != null ? [detail.lat, detail.lon] : undefined),
    [detail],
  );

  return (
    <div className="space-y-16">
      {/* Breadcrumb: every parent links to its canonical entity page. */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
        <a href={locale === "es" ? "/es" : "/en"} className="flex items-center gap-1 text-[var(--muted-strong)] transition-colors hover:text-[var(--ink)]">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.home}
        </a>
        {detail.parents.map((parent) => (
          <div key={parent.id} className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-[var(--muted)]" />
            <a href={parent.pathPrefix} className="text-[var(--muted-strong)] transition-colors hover:text-[var(--ink)] hover:underline">
              {parent.name}
            </a>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 text-[var(--muted)]" />
          <span aria-current="page" className="font-semibold text-[var(--ink)]">{detail.name}</span>
        </div>
      </nav>

      <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)] backdrop-blur-md">
              <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />
              {detail.jurisdictionType}
            </div>
            <h1 className="mt-6 text-4xl font-normal leading-tight text-[var(--ink)] sm:text-5xl md:text-6xl font-serif">
              {detail.name}
            </h1>
            {subtitle ? (
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--muted-strong)] font-serif">{subtitle}</p>
            ) : null}
          </div>

          {detail.level !== "pais" ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
              <p className="text-sm text-[var(--muted-strong)]">{t.claimHint}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={`https://admin.ciutatis.com/admin/auth?claim=${encodeURIComponent(detail.pathPrefix)}`} className="hero-button-solid">
                  {t.claim}
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href={`${routePath(locale, "explore")}?q=${encodeURIComponent(detail.name)}`} className="ghost-button">
                  <Globe2 className="h-4 w-4" />
                  {t.openExplorer}
                </a>
              </div>
            </div>
          ) : (
            <a href={`${routePath(locale, "explore")}`} className="ghost-button inline-flex">
              <Globe2 className="h-4 w-4" />
              {t.openExplorer}
            </a>
          )}
        </div>

        <CivicMap className="h-[400px]" center={center} zoom={detail.level === "pais" ? 4 : detail.level === "provincia" ? 6 : 10} markers={markers} boundary={boundary} />
      </section>

      {childTotal > 0 ? (
        <section className="rounded-2xl border border-[var(--border)] bg-white/80 p-6 shadow-sm sm:p-8">
          <div className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            <Layers className="h-3.5 w-3.5" />
            {t.childrenTitle}
            <span className="text-[var(--muted)]">— {childTotal} {t.entities}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <a
                key={child.id}
                href={child.pathPrefix}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[var(--ink)]">{child.name}</span>
                  <span className="block truncate text-xs text-[var(--muted-strong)]">{child.jurisdictionType}</span>
                </span>
                {child.claimed ? (
                  <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                    {t.inCiutatis}
                  </span>
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                )}
              </a>
            ))}
          </div>
          {children.length < childTotal ? (
            <div className="mt-6 flex justify-center">
              <button type="button" onClick={() => void loadMore()} disabled={loadingChildren} className="ghost-button disabled:opacity-50">
                {t.loadMore} ({children.length}/{childTotal})
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
