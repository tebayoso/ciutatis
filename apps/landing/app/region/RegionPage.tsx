"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Globe2,
  Landmark,
  MapPin,
  Search,
  Shield,
  Users,
  AlertCircle,
  ChevronRight,
  Map as MapIcon,
  Info,
  Layers,
  Activity,
  Clock,
  Tag,
} from "lucide-react";

import { routePath, type Locale } from "../../lib/routes";
import {
  createPlaceFromOsm,
  fetchNominatimEnrichment,
  searchRegionPlaces,
  type NominatimResult,
  type PlaceResult,
  type RegionSearchResult,
} from "../../lib/public-search";
import { lookupOsmBoundary, markerFromNominatim, markerFromPlace } from "../../lib/geo";
import CivicMap from "../components/CivicMap";

const copy = {
  en: {
    back: "Back",
    notFound: "This Ciutatis hasn't been claimed yet nor has data.",
    beFirst: "Be the first to collaborate.",
    searchCities: "Search cities & places",
    searchPlaceholder: "Search for another city, town, or municipality...",
    loading: "Loading civic data...",
    error: "Could not load place data.",
    jurisdiction: "Jurisdiction",
    country: "Country",
    province: "Province / State",
    postalCode: "Postal Code",
    municipality: "Municipality",
    coordinates: "Coordinates",
    civicLayer: "Civic Layer",
    publicRequests: "Public Requests",
    institutions: "Institutions",
    agents: "Agents",
    openPortal: "Open public portal",
    exploreMap: "Explore on map",
    facts: "Key Facts",
    hierarchy: "Administrative Hierarchy",
    discover: "Discover more places",
    openExplorer: "Open the civic map",
    noResults: "No places found.",
    inCiutatis: "In Ciutatis",
    notInCiutatis: "Not yet in Ciutatis",
    claim: "Claim this place",
    overview: "Overview",
    data: "Civic Data",
    map: "Boundary Map",
    about: "About",
  },
  es: {
    back: "Volver",
    notFound: "Esta Ciutatis aún no ha sido reclamada ni tiene datos.",
    beFirst: "Sé el primero en colaborar.",
    searchCities: "Buscar ciudades y lugares",
    searchPlaceholder: "Buscar otra ciudad, pueblo o municipio...",
    loading: "Cargando datos cívicos...",
    error: "No se pudieron cargar los datos del lugar.",
    jurisdiction: "Jurisdicción",
    country: "País",
    province: "Provincia / Estado",
    postalCode: "Código Postal",
    municipality: "Municipio",
    coordinates: "Coordenadas",
    civicLayer: "Capa Cívica",
    publicRequests: "Solicitudes Públicas",
    institutions: "Instituciones",
    agents: "Agentes",
    openPortal: "Abrir portal público",
    exploreMap: "Explorar en mapa",
    facts: "Datos Clave",
    hierarchy: "Jerarquía Administrativa",
    discover: "Descubrir más lugares",
    openExplorer: "Abrir el mapa cívico",
    noResults: "No se encontraron lugares.",
    inCiutatis: "En Ciutatis",
    notInCiutatis: "Aún no en Ciutatis",
    claim: "Reclamar este lugar",
    overview: "Resumen",
    data: "Datos Cívicos",
    map: "Mapa de Límites",
    about: "Acerca de",
  },
};

export default function RegionPage({ locale, pathPrefix }: { locale: Locale; pathPrefix: string }) {
  const t = copy[locale];
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nominatimData, setNominatimData] = useState<NominatimResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RegionSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [creatingPlace, setCreatingPlace] = useState<string | null>(null);

  // Fetch place from Ciutatis API
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/public/places/${encodeURIComponent(pathPrefix)}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          setPlace(data);
          // Also search Nominatim for enrichment
          searchNominatim(data.name, data.countryName ?? data.countryCode);
        } else if (response.status === 404) {
          setPlace(null);
          // Try to infer name from path for Nominatim search
          const inferredName = inferNameFromPath(pathPrefix);
          if (inferredName) searchNominatim(inferredName.name, inferredName.country);
        } else {
          setError(true);
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [pathPrefix]);

  async function searchNominatim(name: string, country: string) {
    const enrichment = await fetchNominatimEnrichment(name, country, locale);
    if (enrichment) setNominatimData(enrichment);
  }

  async function createPlaceFromNominatim(nominatimResult: NominatimResult) {
    const key = `${nominatimResult.osm_type}-${nominatimResult.osm_id}`;
    setCreatingPlace(key);
    const outcome = await createPlaceFromOsm(nominatimResult);
    setCreatingPlace(null);
    if (outcome.ok) {
      window.location.href = outcome.place.url;
    } else {
      alert(outcome.error);
    }
  }

  // Debounced search for admin boundaries using Nominatim API
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        setSearchResults(await searchRegionPlaces(searchQuery));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, locale]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--muted-strong)]">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-[var(--red)]" />
          <p className="text-sm text-[var(--muted-strong)]">{t.error}</p>
        </div>
      </div>
    );
  }

  const pageTitle = place?.name ?? inferNameFromPath(pathPrefix)?.name ?? pathPrefix;
  const pageSubtitle = place
    ? [place.municipalityName, place.parentSubdivisionName, place.countryName ?? place.countryCode.toUpperCase()].filter(Boolean).join(" · ")
    : nominatimData?.display_name ?? pathPrefix;

  return (
    <div className="space-y-16">
      {/* Breadcrumb */}
      <Breadcrumb locale={locale} pathPrefix={pathPrefix} place={place} nominatim={nominatimData} />

      {/* Unclaimed Banner */}
      {!place && (
        <UnclaimedBanner locale={locale} name={pageTitle} pathPrefix={pathPrefix} />
      )}

      {/* Hero Section */}
      <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)] backdrop-blur-md">
              <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />
              {place?.jurisdictionLabel ?? t.jurisdiction}
            </div>
            <h1 className="mt-6 text-4xl font-normal leading-tight text-[var(--ink)] sm:text-5xl md:text-6xl font-serif">
              {pageTitle}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--muted-strong)] font-serif">
              {pageSubtitle}
            </p>
          </div>

          {/* Key Facts */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FactCard
              icon={<Tag className="h-4 w-4" />}
              label={t.jurisdiction}
              value={place?.jurisdictionLabel ?? nominatimData?.type ?? "—"}
            />
            <FactCard
              icon={<Globe2 className="h-4 w-4" />}
              label={t.country}
              value={place?.countryName ?? place?.countryCode.toUpperCase() ?? nominatimData?.address?.country ?? "—"}
            />
            <FactCard
              icon={<Building2 className="h-4 w-4" />}
              label={t.postalCode}
              value={place?.postalCode ?? nominatimData?.address?.postcode ?? "—"}
            />
            <FactCard
              icon={<MapPin className="h-4 w-4" />}
              label={t.coordinates}
              value={nominatimData ? `${Number(nominatimData.lat).toFixed(4)}, ${Number(nominatimData.lon).toFixed(4)}` : "—"}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {place && (
              <a href={place.url} className="hero-button-solid">
                {t.openPortal}
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
            {nominatimData && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${nominatimData.lat}&mlon=${nominatimData.lon}#map=14/${nominatimData.lat}/${nominatimData.lon}`}
                target="_blank"
                rel="noreferrer"
                className="ghost-button"
              >
                <MapIcon className="h-4 w-4" />
                {t.exploreMap}
              </a>
            )}
          </div>
        </div>

        {/* Map Panel */}
        <MapPanel nominatim={nominatimData} place={place} locale={locale} />
      </section>

      {/* Administrative Hierarchy */}
      {(place || nominatimData?.address) && (
        <section className="rounded-2xl border border-[var(--border)] bg-white/80 p-6 shadow-sm sm:p-8">
          <div className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            <Layers className="h-3.5 w-3.5" />
            {t.hierarchy}
          </div>
          <HierarchySteps place={place} nominatim={nominatimData} locale={locale} />
        </section>
      )}

      {/* OpenStreetMap Data */}
      {nominatimData?.extratags && (
        <section className="rounded-2xl border border-[var(--border)] bg-white/80 p-6 shadow-sm sm:p-8">
          <div className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            <Info className="h-3.5 w-3.5" />
            {t.about}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nominatimData.extratags.population && (
              <InfoCard label="Population" value={new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US").format(Number(nominatimData.extratags.population))} />
            )}
            {nominatimData.extratags.area && (
              <InfoCard label="Area" value={`${nominatimData.extratags.area} km²`} />
            )}
            {nominatimData.extratags.wikidata && (
              <InfoCard
                label="Wikidata"
                value={nominatimData.extratags.wikidata}
                href={`https://www.wikidata.org/wiki/${nominatimData.extratags.wikidata}`}
              />
            )}
            {nominatimData.extratags.wikipedia && (
              <InfoCard
                label="Wikipedia"
                value={nominatimData.extratags.wikipedia}
                href={`https://en.wikipedia.org/wiki/${nominatimData.extratags.wikipedia.replace(/ /g, "_")}`}
              />
            )}
          </div>
        </section>
      )}

      {/* Search Other Cities */}
      <section className="rounded-2xl border border-[var(--border)] bg-white/80 p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            <Search className="h-3.5 w-3.5" />
            {t.discover}
          </div>
          <a
            href={`${routePath(locale, "explore")}${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ""}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]"
          >
            <MapIcon className="h-3.5 w-3.5" />
            {t.openExplorer}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
          <input
            className="w-full rounded-xl border border-[var(--border-strong)] bg-white py-4 pl-12 pr-4 text-base outline-none transition focus:border-[var(--accent)]"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchLoading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted-strong)]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            Searching...
          </div>
        )}
        {searchResults.length > 0 && (
          <div className="mt-4 grid gap-3">
            {groupSearchResultsByLevel(searchResults).map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
                  <Layers className="h-3.5 w-3.5" />
                  {group.level}
                </div>
                {group.results.map((result, index) => (
                  <SearchResultCard
                    key={`${result.kind}-${index}`}
                    result={result}
                    locale={locale}
                    onCreate={result.kind === "nominatim" ? () => createPlaceFromNominatim(result.result) : undefined}
                    isCreating={result.kind === "nominatim" ? creatingPlace === `${result.result.osm_type}-${result.result.osm_id}` : false}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
        {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
          <p className="mt-4 text-sm text-[var(--muted-strong)]">{t.noResults}</p>
        )}
      </section>

      {/* Entity Details */}
      {place && (
        <section className="rounded-2xl border border-[var(--border)] bg-white/80 p-6 shadow-sm sm:p-8">
          <div className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            <Activity className="h-3.5 w-3.5" />
            {t.data}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="ID" value={place.id} />
            <DetailRow label={t.municipality} value={place.municipalityName} />
            <DetailRow label={t.jurisdiction} value={place.jurisdictionLabel} />
            <DetailRow label={t.country} value={place.countryName ?? place.countryCode.toUpperCase()} />
            <DetailRow label={t.province} value={place.parentSubdivisionName ?? "—"} />
            <DetailRow label={t.postalCode} value={place.postalCode ?? "—"} />
            <DetailRow label="City Slug" value={place.citySlug} />
            <DetailRow label="Path" value={place.pathPrefix} />
          </div>
        </section>
      )}
    </div>
  );
}

function explorerHref(locale: Locale, name: string): string {
  return `${routePath(locale, "explore")}?q=${encodeURIComponent(name)}`;
}

function Breadcrumb({
  locale,
  pathPrefix,
  place,
  nominatim,
}: {
  locale: Locale;
  pathPrefix: string;
  place: PlaceResult | null;
  nominatim: NominatimResult | null;
}) {
  // Parent entities navigate to the explorer, which renders any admin
  // boundary by name (country, province) on the civic map.
  const country = place?.countryName ?? nominatim?.address?.country ?? pathPrefix.split("/").filter(Boolean)[0]?.toUpperCase();
  const province = place?.parentSubdivisionName ?? nominatim?.address?.state ?? null;
  const current = place?.name ?? nominatim?.display_name.split(",")[0]?.trim() ?? pathPrefix.split("/").filter(Boolean).pop() ?? pathPrefix;

  const crumbs: { label: string; href?: string }[] = [];
  if (country) crumbs.push({ label: country, href: explorerHref(locale, country) });
  if (province) crumbs.push({ label: province, href: explorerHref(locale, province) });
  crumbs.push({ label: current });

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
      <a href={locale === "es" ? "/es" : "/en"} className="flex items-center gap-1 text-[var(--muted-strong)] transition-colors hover:text-[var(--ink)]">
        <ArrowLeft className="h-3.5 w-3.5" />
        {locale === "es" ? "Inicio" : "Home"}
      </a>
      {crumbs.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 text-[var(--muted)]" />
          {item.href ? (
            <a href={item.href} className="text-[var(--muted-strong)] transition-colors hover:text-[var(--ink)] hover:underline">
              {item.label}
            </a>
          ) : (
            <span aria-current="page" className="font-semibold text-[var(--ink)]">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

function UnclaimedBanner({ locale, name, pathPrefix }: { locale: Locale; name: string; pathPrefix: string }) {
  const t = copy[locale];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(196,169,98,0.08),transparent_50%)]" />
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-white/80">
            <AlertCircle className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-[var(--ink)] font-serif">{t.notFound}</h2>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">{t.beFirst}</p>
          </div>
        </div>
        <a href={`https://admin.ciutatis.com/admin/auth?claim=${encodeURIComponent(pathPrefix)}`} className="hero-button-solid shrink-0">
          {t.claim}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function MapPanel({
  nominatim,
  place,
  locale,
}: {
  nominatim: NominatimResult | null;
  place: PlaceResult | null;
  locale: Locale;
}) {
  const t = copy[locale];
  const [boundary, setBoundary] = useState<unknown | null>(null);

  // OSM identity: prefer the stored anchor on the Ciutatis place, fall back to
  // the Nominatim enrichment. Used to fetch the real admin boundary polygon.
  const osmType = place?.osmType ?? nominatim?.osm_type ?? null;
  const osmId = place?.osmId ?? (nominatim ? String(nominatim.osm_id) : null);

  useEffect(() => {
    let cancelled = false;
    setBoundary(null);
    if (!osmType || !osmId) return;
    lookupOsmBoundary(osmType, osmId).then((lookup) => {
      if (!cancelled) setBoundary(lookup?.geojson ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [osmType, osmId]);

  const markers = useMemo(() => {
    const marker = (place ? markerFromPlace(place) : null) ?? (nominatim ? markerFromNominatim(nominatim) : null);
    return marker ? [marker] : [];
  }, [place, nominatim]);

  const center = useMemo<[number, number] | undefined>(() => {
    const marker = markers[0];
    return marker ? [marker.lat, marker.lon] : undefined;
  }, [markers]);

  if (markers.length === 0 && !boundary) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
        <div className="text-center">
          <MapIcon className="mx-auto mb-3 h-8 w-8 text-[var(--muted)]" />
          <p className="text-sm text-[var(--muted-strong)]">{t.map}</p>
        </div>
      </div>
    );
  }

  return <CivicMap className="h-[400px]" center={center} zoom={11} markers={markers} boundary={boundary} />;
}

function FactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
      <div className="mb-2 text-[var(--accent)]">{icon}</div>
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-lg font-medium text-[var(--ink)] font-serif">{value}</div>
    </div>
  );
}

function InfoCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-base font-medium text-[var(--ink)] font-serif">{value}</div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
      <span className="text-sm text-[var(--muted-strong)]">{label}</span>
      <span className="text-sm font-medium text-[var(--ink)]">{value}</span>
    </div>
  );
}

function HierarchySteps({
  place,
  nominatim,
  locale,
}: {
  place: PlaceResult | null;
  nominatim: NominatimResult | null;
  locale: Locale;
}) {
  const steps: { label: string; icon: React.ReactNode; active?: boolean; href?: string }[] = [];

  // Parent admin entities link to the explorer (OSM resolves them by name).
  // The editorial municipality label ("Municipio de X") is not an OSM name,
  // so that chip stays unlinked.
  if (place) {
    const country = place.countryName ?? place.countryCode.toUpperCase();
    steps.push({ label: country, icon: <Globe2 className="h-4 w-4" />, href: explorerHref(locale, country) });
    if (place.parentSubdivisionName) {
      steps.push({ label: place.parentSubdivisionName, icon: <Building2 className="h-4 w-4" />, href: explorerHref(locale, place.parentSubdivisionName) });
    }
    steps.push({ label: place.municipalityName, icon: <Landmark className="h-4 w-4" /> });
    steps.push({ label: place.name, icon: <MapPin className="h-4 w-4" />, active: true });
  } else if (nominatim?.address) {
    const addr = nominatim.address;
    if (addr.country) steps.push({ label: addr.country, icon: <Globe2 className="h-4 w-4" />, href: explorerHref(locale, addr.country) });
    if (addr.state) steps.push({ label: addr.state, icon: <Building2 className="h-4 w-4" />, href: explorerHref(locale, addr.state) });
    if (addr.county) steps.push({ label: addr.county, icon: <Landmark className="h-4 w-4" />, href: explorerHref(locale, addr.county) });
    if (addr.city || addr.town || addr.municipality) {
      steps.push({ label: addr.city || addr.town || addr.municipality || "", icon: <MapPin className="h-4 w-4" />, active: true });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((step, index) => {
        const chipClass = `flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
          step.active
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
            : "border-[var(--border)] bg-[var(--panel)] text-[var(--muted-strong)]"
        }`;
        const chipContent = (
          <>
            <span className={step.active ? "text-[var(--accent)]" : "text-[var(--muted)]"}>{step.icon}</span>
            {step.label}
          </>
        );
        return (
          <div key={index} className="flex items-center gap-3">
            {step.href ? (
              <a href={step.href} className={`${chipClass} transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:text-[var(--ink)] hover:shadow-sm`}>
                {chipContent}
              </a>
            ) : (
              <div className={chipClass}>{chipContent}</div>
            )}
            {index < steps.length - 1 && <ChevronRight className="h-4 w-4 text-[var(--muted)]" />}
          </div>
        );
      })}
    </div>
  );
}

function SearchResultCard({
  result,
  locale,
  onCreate,
  isCreating,
}: {
  result: RegionSearchResult;
  locale: Locale;
  onCreate?: () => void;
  isCreating?: boolean;
}) {
  const t = copy[locale];

  if (result.kind === "place") {
    return (
      <a
        href={result.place.url}
        className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-white/80">
            <MapPin className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--ink)]">{result.place.name}</span>
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">{t.inCiutatis}</span>
            </div>
            <p className="text-sm text-[var(--muted-strong)]">
              {result.place.jurisdictionLabel} · {result.place.parentSubdivisionName ?? ""} · {result.place.countryName ?? result.place.countryCode.toUpperCase()}
            </p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-[var(--accent)]" />
      </a>
    );
  }

  // Nominatim result - not in Ciutatis
  const displayName = result.result.display_name;
  const shortName = displayName.split(",")[0]?.trim() ?? displayName;
  const country = result.result.address?.country ?? "";

  return (
    <div className="flex items-center justify-between rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel)] p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-white/80">
          <Globe2 className="h-5 w-5 text-[var(--muted)]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--ink)]">{shortName}</span>
            <span className="rounded-full border border-[var(--border-strong)] bg-white px-2 py-0.5 text-xs font-semibold text-[var(--muted-strong)]">{t.notInCiutatis}</span>
          </div>
          <p className="text-sm text-[var(--muted-strong)]">{displayName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onCreate && (
          <button
            onClick={onCreate}
            disabled={isCreating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-dark)] disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5" />
                {t.claim}
              </>
            )}
          </button>
        )}
        {!onCreate && (
          <a
            href={`https://admin.ciutatis.com/admin/auth?claim=${encodeURIComponent(shortName)},${encodeURIComponent(country)}`}
            className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]"
          >
            {t.claim}
          </a>
        )}
      </div>
    </div>
  );
}

function inferNameFromPath(pathPrefix: string): { name: string; country: string } | null {
  const parts = pathPrefix.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const countryCode = parts[0];
  const routeSegment = parts[parts.length - 1];
  // Extract city slug from route segment like "7000-tandil"
  const slugMatch = routeSegment.match(/^[a-z0-9]*-?([a-z-]+)$/i);
  const name = slugMatch?.[1]?.replace(/-/g, " ") ?? routeSegment;
  const countryMap: Record<string, string> = { ar: "Argentina", us: "United States", mx: "Mexico", br: "Brazil", es: "Spain" };
  return { name: name.charAt(0).toUpperCase() + name.slice(1), country: countryMap[countryCode.toLowerCase()] ?? countryCode.toUpperCase() };
}

function getAdminLevelLabel(type: string): string {
  const levelMap: Record<string, string> = {
    country: "Country",
    state: "State / Province",
    county: "County",
    city: "City",
    town: "Town",
    municipality: "Municipality",
    village: "Village",
    borough: "Borough",
    suburb: "Suburb",
    neighbourhood: "Neighbourhood",
  };
  return levelMap[type.toLowerCase()] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

function groupSearchResultsByLevel(results: RegionSearchResult[]): { level: string; results: RegionSearchResult[] }[] {
  const groups: Record<string, RegionSearchResult[]> = {};
  for (const result of results) {
    const level = result.kind === "place"
      ? result.place.jurisdictionType
      : getAdminLevelLabel(result.result.type);
    if (!groups[level]) groups[level] = [];
    groups[level].push(result);
  }
  const order = ["Country", "State / Province", "County", "City", "Town", "Municipality", "Village", "Borough", "Suburb", "Neighbourhood"];
  return Object.entries(groups)
    .sort(([a], [b]) => {
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(([level, results]) => ({ level, results }));
}
