import { parseTenantRoutePathname } from "@paperclipai/shared";

type TenantRoute = NonNullable<ReturnType<typeof parseTenantRoutePathname>>;
type CivicScopeKey = "country" | "province" | "partido" | "municipio";

interface TenantRecord {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  pathPrefix: string;
  settings?: string | null;
}

interface TenantMetrics {
  requestTotal: number;
  requestActive: number;
  requestResolved: number;
  requestWaiting: number;
  latestRequestAt: string | null;
  agentTotal: number;
  agentAttending: number;
  attendanceRate: number;
}

interface GeoJsonFeature {
  type: "Feature";
  geometry: unknown;
  properties?: Record<string, unknown>;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

interface Env {
  LANDING_ORIGIN: string;
  ROUTING_CACHE: KVNamespace;
  DB: D1Database;
  TENANT_CACHE: KVNamespace;
  ASSETS: R2Bucket;
}

const TANDIL_CANONICAL_PATH = "/ar/municipio/7000-tandil";
const TANDIL_PORTAL_INSTITUTION_SLUG = "ciu-ciutatis";
const BOUNDARY_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;

const TANDIL_SCOPE_ROUTES: Record<CivicScopeKey, {
  label: string;
  shortLabel: string;
  href: string;
  georefCollection: "provincias" | "departamentos" | "municipios";
  georefId: string | null;
  coverage: string;
  mapCaption: string;
}> = {
  country: {
    label: "Argentina",
    shortLabel: "Country",
    href: "/ar/nacion/argentina",
    georefCollection: "provincias",
    georefId: null,
    coverage: "National operating context for Argentina.",
    mapCaption: "National boundary view using Argentina province polygons.",
  },
  province: {
    label: "Provincia de Buenos Aires",
    shortLabel: "Province",
    href: "/ar/provincia/buenos-aires",
    georefCollection: "provincias",
    georefId: "06",
    coverage: "Provincial scope containing Tandil and the surrounding Buenos Aires jurisdictions.",
    mapCaption: "Province boundary from Georef province geometry.",
  },
  partido: {
    label: "Partido de Tandil",
    shortLabel: "Partido",
    href: "/ar/partido/7000-tandil",
    georefCollection: "departamentos",
    georefId: "06791",
    coverage: "Partido scope for Tandil in Provincia de Buenos Aires.",
    mapCaption: "Partido boundary from Georef departamento/partido geometry.",
  },
  municipio: {
    label: "Municipio de Tandil",
    shortLabel: "Municipio",
    href: TANDIL_CANONICAL_PATH,
    georefCollection: "municipios",
    georefId: "060791",
    coverage: "Municipal scope for public requests, attendance, and service routing in Tandil.",
    mapCaption: "Municipal boundary from Georef municipio geometry.",
  },
};

const TANDIL_PATH_TO_SCOPE = new Map(
  Object.entries(TANDIL_SCOPE_ROUTES).map(([scope, config]) => [config.href, scope as CivicScopeKey]),
);

function proxyRequest(targetOrigin: string, request: Request, pathname: string) {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(pathname + incomingUrl.search, targetOrigin);
  return new Request(upstreamUrl.toString(), request);
}

function scopeForPathPrefix(pathPrefix: string): CivicScopeKey | null {
  return TANDIL_PATH_TO_SCOPE.get(pathPrefix) ?? null;
}

async function lookupTenant(db: D1Database, pathPrefix: string): Promise<TenantRecord | null> {
  const result = await db
    .prepare(`
      SELECT
        id,
        city_slug AS slug,
        name,
        hostname AS domain,
        path_prefix AS pathPrefix,
        notes AS settings
      FROM tenant_instances
      WHERE path_prefix = ?
        AND status = 'active'
      LIMIT 1
    `)
    .bind(pathPrefix)
    .first<TenantRecord>();

  return result || null;
}

async function lookupTenantById(db: D1Database, tenantId: string): Promise<TenantRecord | null> {
  const result = await db
    .prepare(`
      SELECT
        id,
        city_slug AS slug,
        name,
        hostname AS domain,
        path_prefix AS pathPrefix,
        notes AS settings
      FROM tenant_instances
      WHERE id = ?
        AND status = 'active'
      LIMIT 1
    `)
    .bind(tenantId)
    .first<TenantRecord>();

  return result || null;
}

async function resolveTenant(env: Env, tenantRoute: TenantRoute): Promise<{
  tenant: TenantRecord | null;
  selectedScope: CivicScopeKey;
}> {
  const selectedScope = scopeForPathPrefix(tenantRoute.pathPrefix) ?? "municipio";
  const cached = await env.ROUTING_CACHE.get(tenantRoute.pathPrefix, "json") as { tenantId: string } | null;

  let tenant: TenantRecord | null = null;
  if (cached?.tenantId) {
    tenant = await lookupTenantById(env.DB, cached.tenantId);
  }

  if (!tenant) {
    tenant = await lookupTenant(env.DB, tenantRoute.pathPrefix);
  }

  if (!tenant && scopeForPathPrefix(tenantRoute.pathPrefix)) {
    tenant = await lookupTenant(env.DB, TANDIL_CANONICAL_PATH);
  }

  if (tenant) {
    await env.ROUTING_CACHE.put(
      tenantRoute.pathPrefix,
      JSON.stringify({ tenantId: tenant.id, pathPrefix: tenant.pathPrefix }),
      { expirationTtl: 300 },
    );
  }

  return { tenant, selectedScope };
}

function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function loadTenantMetrics(db: D1Database): Promise<TenantMetrics> {
  const empty: TenantMetrics = {
    requestTotal: 0,
    requestActive: 0,
    requestResolved: 0,
    requestWaiting: 0,
    latestRequestAt: null,
    agentTotal: 0,
    agentAttending: 0,
    attendanceRate: 0,
  };

  try {
    const requestStats = await db
      .prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN public_status IN ('received', 'triage', 'routed', 'in_progress', 'waiting_on_city') THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN public_status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS resolved,
          SUM(CASE WHEN public_status = 'waiting_on_city' THEN 1 ELSE 0 END) AS waiting,
          MAX(updated_at) AS latestRequestAt
        FROM public_requests
        WHERE institution_slug = ?
          AND (
            location_label LIKE '%Tandil%'
            OR public_title LIKE '%Tandil%'
            OR public_summary LIKE '%Tandil%'
            OR public_description LIKE '%Tandil%'
          )
      `)
      .bind(TANDIL_PORTAL_INSTITUTION_SLUG)
      .first<{
        total: number | null;
        active: number | null;
        resolved: number | null;
        waiting: number | null;
        latestRequestAt: string | null;
      }>();

    const agentStats = await db
      .prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status IN ('idle', 'active', 'running') THEN 1 ELSE 0 END) AS attending
        FROM agents
        WHERE company_id = (
          SELECT id FROM companies WHERE issue_prefix = 'CIU' AND status IN ('active', 'paused') LIMIT 1
        )
          AND status <> 'terminated'
      `)
      .first<{ total: number | null; attending: number | null }>();

    const agentTotal = toNumber(agentStats?.total);
    const agentAttending = toNumber(agentStats?.attending);
    const attendanceRate = agentTotal > 0 ? Math.round((agentAttending / agentTotal) * 100) : 0;

    return {
      requestTotal: toNumber(requestStats?.total),
      requestActive: toNumber(requestStats?.active),
      requestResolved: toNumber(requestStats?.resolved),
      requestWaiting: toNumber(requestStats?.waiting),
      latestRequestAt: requestStats?.latestRequestAt ?? null,
      agentTotal,
      agentAttending,
      attendanceRate,
    };
  } catch {
    return empty;
  }
}

function normalizeScope(value: string | undefined): CivicScopeKey | null {
  if (!value) return null;
  if (value === "country" || value === "province" || value === "partido" || value === "municipio") {
    return value;
  }
  return null;
}

async function loadBoundaryPayload(env: Env, scope: CivicScopeKey) {
  const scopeConfig = TANDIL_SCOPE_ROUTES[scope];
  const cacheKey = `georef-boundary:${scope}:${scopeConfig.georefCollection}:${scopeConfig.georefId ?? "all"}`;
  const cached = await env.TENANT_CACHE.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as {
      scope: CivicScopeKey;
      label: string;
      coverage: string;
      mapCaption: string;
      source: string;
      geojson: GeoJsonFeatureCollection;
    };
  }

  const upstreamUrl = `https://apis.datos.gob.ar/georef/api/${scopeConfig.georefCollection}.geojson`;
  const upstream = await fetch(upstreamUrl, {
    cf: { cacheEverything: true, cacheTtl: BOUNDARY_CACHE_TTL_SECONDS },
  });
  if (!upstream.ok) {
    throw new Error(`Georef boundary request failed with ${upstream.status}`);
  }

  const collection = await upstream.json() as GeoJsonFeatureCollection;
  const features = scopeConfig.georefId
    ? collection.features.filter((feature) => String(feature.properties?.id ?? "") === scopeConfig.georefId)
    : collection.features;

  if (features.length === 0) {
    throw new Error(`No Georef boundary found for ${scope}`);
  }

  const payload = {
    scope,
    label: scopeConfig.label,
    coverage: scopeConfig.coverage,
    mapCaption: scopeConfig.mapCaption,
    source: "https://apis.datos.gob.ar/georef/api",
    geojson: {
      type: "FeatureCollection" as const,
      features,
    },
  };

  await env.TENANT_CACHE.put(cacheKey, JSON.stringify(payload), {
    expirationTtl: BOUNDARY_CACHE_TTL_SECONDS,
  });

  return payload;
}

async function handleBoundaryRequest(env: Env, scopeValue: string | undefined) {
  const scope = normalizeScope(scopeValue);
  if (!scope) {
    return Response.json({ error: "Unknown civic scope" }, { status: 404 });
  }

  try {
    const payload = await loadBoundaryPayload(env, scope);
    return Response.json(payload, {
      headers: {
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Boundary unavailable" },
      { status: 502 },
    );
  }
}

async function handleTenantRequest(
  request: Request,
  env: Env,
  tenant: TenantRecord,
  tenantRoute: TenantRoute,
  selectedScope: CivicScopeKey,
): Promise<Response> {
  const boundaryMatch = /^\/__tenant\/boundary\/([a-z-]+)$/.exec(tenantRoute.remainderPath);
  if (boundaryMatch) {
    return handleBoundaryRequest(env, boundaryMatch[1]);
  }

  if (tenantRoute.remainderPath === "/__tenant/health") {
    return Response.json({
      ok: true,
      tenantId: tenant.id,
      tenantName: tenant.name,
      pathPrefix: tenant.pathPrefix,
      hasD1: Boolean(env.DB),
      hasKv: Boolean(env.TENANT_CACHE),
      hasR2: Boolean(env.ASSETS),
    });
  }

  const metrics = await loadTenantMetrics(env.DB);
  const html = renderTandilTenantPage({
    tenant,
    selectedScope,
    metrics,
    currentPath: new URL(request.url).pathname,
  });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function renderBreadcrumbs(selectedScope: CivicScopeKey) {
  return (Object.entries(TANDIL_SCOPE_ROUTES) as Array<[CivicScopeKey, typeof TANDIL_SCOPE_ROUTES[CivicScopeKey]]>)
    .map(([scope, item], index) => {
      const active = scope === selectedScope ? "true" : "false";
      const separator = index === 0 ? "" : `<span class="crumb-separator" aria-hidden="true">/</span>`;
      return `${separator}<a class="crumb" aria-current="${active === "true" ? "page" : "false"}" data-scope="${scope}" href="${item.href}"><span>${escapeHtml(item.shortLabel)}</span>${escapeHtml(item.label)}</a>`;
    })
    .join("");
}

function renderTandilTenantPage(args: {
  tenant: TenantRecord;
  selectedScope: CivicScopeKey;
  metrics: TenantMetrics;
  currentPath: string;
}) {
  const scopeConfig = TANDIL_SCOPE_ROUTES[args.selectedScope];
  const state = {
    selectedScope: args.selectedScope,
    currentPath: args.currentPath,
    scopes: TANDIL_SCOPE_ROUTES,
    portalInstitutionSlug: TANDIL_PORTAL_INSTITUTION_SLUG,
    tenantPathPrefix: args.tenant.pathPrefix,
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#f7f3ea" />
    <title>Tandil Public Civic Portal - Ciutatis</title>
    <meta name="description" content="Public civic portal for Tandil, Provincia de Buenos Aires, Argentina." />
    <link rel="preconnect" href="https://unpkg.com" />
    <link rel="preconnect" href="https://tile.openstreetmap.org" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      :root {
        color-scheme: light;
        --ink: #17211b;
        --muted: #5f6f66;
        --line: rgba(23, 33, 27, 0.14);
        --paper: #fffdf8;
        --soft: #f2efe5;
        --green: #0f6b57;
        --blue: #1d5b86;
        --amber: #b16b12;
        --red: #a83b2f;
      }

      * {
        box-sizing: border-box;
      }

      html {
        min-height: 100%;
        background: #f7f3ea;
      }

      body {
        margin: 0;
        min-height: 100vh;
        overflow-x: hidden;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          linear-gradient(120deg, rgba(15, 107, 87, 0.11), transparent 31rem),
          linear-gradient(260deg, rgba(29, 91, 134, 0.12), transparent 36rem),
          #f7f3ea;
        color: var(--ink);
      }

      a {
        color: inherit;
      }

      .skip-link {
        position: absolute;
        left: 1rem;
        top: 1rem;
        z-index: 1000;
        transform: translateY(-150%);
        border-radius: 999px;
        background: var(--ink);
        color: white;
        padding: 0.65rem 1rem;
        transition: transform 160ms ease;
      }

      .skip-link:focus-visible {
        transform: translateY(0);
        outline: 3px solid rgba(15, 107, 87, 0.35);
      }

      .page {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 18px 0 56px;
      }

      header {
        display: grid;
        gap: 22px;
        padding: 24px 0 18px;
      }

      .topline {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .brand-mark {
        display: grid;
        width: 34px;
        height: 34px;
        place-items: center;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.72);
        color: var(--green);
        font-weight: 900;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(15, 107, 87, 0.24);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        padding: 9px 12px;
        color: var(--green);
        font-size: 0.82rem;
        font-weight: 700;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #19a974;
        box-shadow: 0 0 0 4px rgba(25, 169, 116, 0.13);
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
        gap: 22px;
        align-items: stretch;
      }

      .hero-copy,
      .map-panel,
      .metric,
      .section,
      .form-panel,
      .request-panel {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255, 253, 248, 0.9);
        box-shadow: 0 18px 52px rgba(23, 33, 27, 0.08);
      }

      .hero-copy {
        padding: clamp(24px, 4vw, 44px);
      }

      .eyebrow,
      .label {
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      h1 {
        max-width: 720px;
        margin-top: 14px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(2.7rem, 7vw, 6.3rem);
        font-weight: 700;
        letter-spacing: 0;
        line-height: 0.92;
        text-wrap: balance;
      }

      .lede {
        max-width: 680px;
        margin-top: 22px;
        color: #38473f;
        font-size: clamp(1rem, 2vw, 1.22rem);
        line-height: 1.72;
      }

      .facts {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 28px;
      }

      .fact {
        min-width: 0;
        border: 1px solid rgba(23, 33, 27, 0.1);
        border-radius: 8px;
        background: rgba(242, 239, 229, 0.7);
        padding: 14px;
      }

      .fact strong {
        display: block;
        margin-top: 5px;
        font-size: 1rem;
      }

      .map-panel {
        min-width: 0;
        overflow: hidden;
        background: #eef3ed;
      }

      .map-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        border-bottom: 1px solid var(--line);
        background: rgba(255, 253, 248, 0.86);
        padding: 14px;
      }

      .map-title {
        min-width: 0;
      }

      .map-title strong {
        display: block;
        overflow-wrap: anywhere;
      }

      .map-title span {
        color: var(--muted);
        font-size: 0.8rem;
      }

      #coverage-map {
        width: 100%;
        height: min(60vh, 560px);
        min-height: 390px;
        background: #dbe8df;
      }

      .map-caption {
        border-top: 1px solid var(--line);
        background: rgba(255, 253, 248, 0.92);
        padding: 12px 14px;
        color: var(--muted);
        font-size: 0.83rem;
        line-height: 1.5;
      }

      .breadcrumbs {
        display: flex;
        flex-wrap: wrap;
        align-items: stretch;
        gap: 8px;
        margin-top: 18px;
      }

      .crumb-separator {
        align-self: center;
        color: rgba(23, 33, 27, 0.28);
      }

      .crumb {
        display: inline-flex;
        min-height: 44px;
        flex-direction: column;
        justify-content: center;
        gap: 2px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.7);
        padding: 8px 12px;
        text-decoration: none;
        transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease;
      }

      .crumb:hover,
      .crumb:focus-visible {
        border-color: rgba(15, 107, 87, 0.42);
        background: white;
        color: var(--green);
        outline: none;
        transform: translateY(-1px);
      }

      .crumb[aria-current="page"],
      .crumb.is-active {
        border-color: rgba(15, 107, 87, 0.45);
        background: rgba(15, 107, 87, 0.09);
        color: var(--green);
      }

      .crumb span {
        color: var(--muted);
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 22px;
      }

      .metric {
        min-width: 0;
        padding: 18px;
      }

      .metric-value {
        margin-top: 10px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(2rem, 4vw, 3.1rem);
        line-height: 0.95;
      }

      .metric p {
        margin-top: 10px;
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .grid {
        display: grid;
        grid-template-columns: minmax(0, 0.92fr) minmax(340px, 0.58fr);
        gap: 18px;
        margin-top: 18px;
        align-items: start;
      }

      .section,
      .form-panel,
      .request-panel {
        padding: 22px;
      }

      h2 {
        margin-top: 8px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(1.9rem, 4vw, 3rem);
        line-height: 1;
        text-wrap: balance;
      }

      .section-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 18px;
      }

      .info-row {
        border-left: 3px solid rgba(15, 107, 87, 0.55);
        background: rgba(242, 239, 229, 0.56);
        padding: 14px;
      }

      .info-row strong {
        display: block;
        margin-bottom: 5px;
      }

      .info-row span,
      .sources,
      .request-empty {
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.55;
      }

      .forms-list {
        display: grid;
        gap: 10px;
        margin-top: 18px;
      }

      .form-type {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.62);
        padding: 14px;
      }

      .form-type strong {
        display: block;
      }

      .form-type span {
        display: block;
        margin-top: 4px;
        color: var(--muted);
        font-size: 0.86rem;
        line-height: 1.45;
      }

      .form-type button,
      .submit-button {
        border: 1px solid rgba(15, 107, 87, 0.38);
        border-radius: 8px;
        background: var(--green);
        color: white;
        cursor: pointer;
        font: inherit;
        font-size: 0.86rem;
        font-weight: 800;
        padding: 10px 12px;
        touch-action: manipulation;
        transition: background-color 150ms ease, transform 150ms ease;
      }

      .form-type button:hover,
      .submit-button:hover {
        background: #0b5848;
        transform: translateY(-1px);
      }

      .form-type button:focus-visible,
      .submit-button:focus-visible,
      input:focus-visible,
      textarea:focus-visible,
      select:focus-visible {
        outline: 3px solid rgba(15, 107, 87, 0.25);
        outline-offset: 2px;
      }

      form {
        display: grid;
        gap: 13px;
        margin-top: 18px;
      }

      label {
        display: grid;
        gap: 6px;
        color: #26352e;
        font-size: 0.86rem;
        font-weight: 800;
      }

      input,
      textarea,
      select {
        width: 100%;
        border: 1px solid rgba(23, 33, 27, 0.18);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.85);
        color: var(--ink);
        font: inherit;
        font-size: 0.95rem;
        padding: 11px 12px;
      }

      textarea {
        min-height: 132px;
        resize: vertical;
      }

      .two {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .form-note {
        color: var(--muted);
        font-size: 0.84rem;
        line-height: 1.5;
      }

      .form-message {
        min-height: 22px;
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .form-message.error {
        color: var(--red);
      }

      .form-message.success {
        color: var(--green);
      }

      .request-list {
        display: grid;
        gap: 10px;
        margin-top: 18px;
      }

      .request-item {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.68);
        padding: 14px;
      }

      .request-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-top: 9px;
        color: var(--muted);
        font-size: 0.78rem;
      }

      .tag {
        border: 1px solid rgba(29, 91, 134, 0.24);
        border-radius: 999px;
        padding: 4px 8px;
        color: var(--blue);
        font-weight: 800;
      }

      .sources {
        margin-top: 18px;
      }

      .sources a {
        color: var(--green);
        font-weight: 700;
      }

      footer {
        margin-top: 22px;
        color: var(--muted);
        font-size: 0.82rem;
        line-height: 1.5;
      }

      @media (max-width: 940px) {
        .hero,
        .grid,
        .metrics {
          grid-template-columns: 1fr;
        }

        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 620px) {
        .page {
          width: min(100vw - 20px, 1180px);
          padding-bottom: calc(38px + env(safe-area-inset-bottom));
        }

        .topline,
        .map-toolbar,
        .form-type {
          align-items: stretch;
          flex-direction: column;
        }

        .facts,
        .section-grid,
        .metrics,
        .two {
          grid-template-columns: 1fr;
        }

        #coverage-map {
          min-height: 330px;
          height: 430px;
        }

        .hero-copy,
        .section,
        .form-panel,
        .request-panel {
          padding: 18px;
        }

        .crumb {
          width: 100%;
        }

        .crumb-separator {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    </style>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to main content</a>
    <div class="page">
      <header>
        <div class="topline">
          <div class="brand" translate="no"><span class="brand-mark">C</span> Ciutatis Public Sites</div>
          <div class="status-pill"><span class="status-dot" aria-hidden="true"></span> Live tenant route</div>
        </div>

        <div class="hero">
          <section class="hero-copy" aria-labelledby="page-title">
            <div class="eyebrow">Provincia de Buenos Aires, Argentina</div>
            <h1 id="page-title">Tandil Public Civic Portal</h1>
            <p class="lede">
              Tandil is the launch municipal tenant for Argentina. This page covers the Municipio and Partido de Tandil,
              publishes public request forms, shows live civic-routing metrics, and maps the exact operating boundary used by Ciutatis.
            </p>
            <nav class="breadcrumbs" aria-label="Administrative levels">
              ${renderBreadcrumbs(args.selectedScope)}
            </nav>
            <div class="facts" aria-label="Tandil facts">
              <div class="fact"><span class="label">Postal Code</span><strong>7000</strong></div>
              <div class="fact"><span class="label">Georef IDs</span><strong>Municipio 060791 / Partido 06791</strong></div>
              <div class="fact"><span class="label">Population</span><strong>More than 140,000 residents</strong></div>
              <div class="fact"><span class="label">Surface</span><strong>Nearly 5,000 km2</strong></div>
            </div>
          </section>

          <section class="map-panel" aria-labelledby="map-heading">
            <div class="map-toolbar">
              <div class="map-title">
                <span>Current scope</span>
                <strong id="map-heading">${escapeHtml(scopeConfig.label)}</strong>
              </div>
              <div class="status-pill" id="map-status"><span class="status-dot" aria-hidden="true"></span> Loading boundary</div>
            </div>
            <div id="coverage-map" role="application" aria-label="Interactive boundary map for Tandil"></div>
            <div class="map-caption" id="map-caption">${escapeHtml(scopeConfig.coverage)}</div>
          </section>
        </div>

        <section class="metrics" aria-label="Live civic metrics">
          <div class="metric">
            <div class="label">Public Requests</div>
            <div class="metric-value" id="metric-total">${formatNumber(args.metrics.requestTotal)}</div>
            <p>Tandil-tagged public submissions in the Ciutatis civic queue.</p>
          </div>
          <div class="metric">
            <div class="label">Active Cases</div>
            <div class="metric-value" id="metric-active">${formatNumber(args.metrics.requestActive)}</div>
            <p>Received, triage, routed, in progress, or waiting on city.</p>
          </div>
          <div class="metric">
            <div class="label">Resolved</div>
            <div class="metric-value" id="metric-resolved">${formatNumber(args.metrics.requestResolved)}</div>
            <p>Closed or resolved public records for this tenant scope.</p>
          </div>
          <div class="metric">
            <div class="label">Attendance Rate</div>
            <div class="metric-value" id="metric-attendance">${formatNumber(args.metrics.attendanceRate)}%</div>
            <p id="metric-attendance-copy">${formatNumber(args.metrics.agentAttending)} of ${formatNumber(args.metrics.agentTotal)} routing agents available.</p>
          </div>
        </section>
      </header>

      <main id="main" class="grid">
        <div class="main-flow">
          <section class="section" aria-labelledby="about-heading">
            <div class="eyebrow">Coverage & local context</div>
            <h2 id="about-heading">What this Tandil page covers</h2>
            <div class="section-grid">
              <div class="info-row">
                <strong>Administrative hierarchy</strong>
                <span>Argentina / Provincia de Buenos Aires / Partido de Tandil / Municipio de Tandil.</span>
              </div>
              <div class="info-row">
                <strong>Operating boundary</strong>
                <span id="coverage-copy">${escapeHtml(scopeConfig.coverage)}</span>
              </div>
              <div class="info-row">
                <strong>Economic profile</strong>
                <span>Agriculture, livestock, tourism, metalworking, food industry, technology, and software.</span>
              </div>
              <div class="info-row">
                <strong>Civic intake</strong>
                <span>Reports are routed to the Ciutatis public queue with privacy filtering and public status tracking.</span>
              </div>
            </div>
            <p class="sources">
              Sources: <a href="https://www.tandil.gov.ar/info_ciudad" rel="noreferrer">Municipio de Tandil</a>,
              <a href="https://www.argentina.gob.ar/georef/georef-servicio-de-normalizacion-de-direcciones-y-unidades-territoriales-de-argentina-16" rel="noreferrer">Georef Argentina</a>,
              <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">OpenStreetMap</a>.
            </p>
          </section>

          <section class="section" aria-labelledby="forms-heading">
            <div class="eyebrow">Available forms</div>
            <h2 id="forms-heading">Civic forms for Tandil</h2>
            <div class="forms-list">
              <div class="form-type">
                <div><strong>Report a local issue</strong><span>Infrastructure, sanitation, mobility, safety, housing, or environment.</span></div>
                <button type="button" data-template="issue">Use Form</button>
              </div>
              <div class="form-type">
                <div><strong>Register attendance or public participation</strong><span>Record presence for a meeting, hearing, inspection, or neighborhood activity.</span></div>
                <button type="button" data-template="attendance">Use Form</button>
              </div>
              <div class="form-type">
                <div><strong>Ask about permits or services</strong><span>Start a permit, service, or municipal process question.</span></div>
                <button type="button" data-template="permit">Use Form</button>
              </div>
            </div>
          </section>

          <section class="request-panel" aria-labelledby="requests-heading">
            <div class="eyebrow">Public ledger</div>
            <h2 id="requests-heading">Latest Tandil records</h2>
            <div class="request-list" id="request-list">
              <div class="request-empty">Loading public records...</div>
            </div>
          </section>
        </div>

        <aside class="form-panel" aria-labelledby="submit-heading">
          <div class="eyebrow">Submit to Ciutatis</div>
          <h2 id="submit-heading">Open a Tandil request</h2>
          <p class="form-note">
            Public text is filtered for privacy before it appears in the ledger. Add contact details only if you want a recovery token.
          </p>
          <form id="public-request-form" novalidate>
            <label for="form-type">Form Type
              <select id="form-type" name="formType" autocomplete="off">
                <option value="issue">Local issue report</option>
                <option value="attendance">Attendance / participation record</option>
                <option value="permit">Permit or service question</option>
              </select>
            </label>
            <label for="category">Category
              <select id="category" name="category" autocomplete="off">
                <option value="infrastructure">Infrastructure</option>
                <option value="sanitation">Sanitation</option>
                <option value="mobility">Mobility</option>
                <option value="safety">Safety</option>
                <option value="permits">Permits</option>
                <option value="housing">Housing</option>
                <option value="environment">Environment</option>
                <option value="corruption">Corruption</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label for="title">Title
              <input id="title" name="title" type="text" autocomplete="off" required minlength="4" maxlength="180" placeholder="Example: Broken streetlight near Plaza Independencia..." />
            </label>
            <label for="location">Location
              <input id="location" name="location" type="text" autocomplete="off" maxlength="180" placeholder="Example: Tandil, 7000, neighborhood or street..." value="Tandil, Provincia de Buenos Aires" />
            </label>
            <label for="description">Details
              <textarea id="description" name="description" required minlength="12" maxlength="8000" placeholder="Describe what happened, what service is needed, or the attendance context..."></textarea>
            </label>
            <div class="two">
              <label for="contact-name">Contact Name
                <input id="contact-name" name="contactName" type="text" autocomplete="name" maxlength="120" placeholder="Optional..." />
              </label>
              <label for="contact-email">Contact Email
                <input id="contact-email" name="contactEmail" type="email" inputmode="email" autocomplete="email" maxlength="320" spellcheck="false" placeholder="Optional..." />
              </label>
            </div>
            <p class="form-note">Leave contact fields empty to publish anonymously. If you add email, name is required for guest recovery.</p>
            <button class="submit-button" type="submit">Submit Tandil Request</button>
            <div class="form-message" id="form-message" aria-live="polite"></div>
          </form>
        </aside>
      </main>

      <footer>
        Tenant ID <span translate="no">${escapeHtml(args.tenant.id)}</span> / route <span translate="no">${escapeHtml(args.tenant.pathPrefix)}</span>.
        Boundary data is loaded on demand from Argentina Georef and cached at the edge.
      </footer>
    </div>

    <script id="tenant-data" type="application/json">${escapeScriptJson(state)}</script>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      (function () {
        const state = JSON.parse(document.getElementById("tenant-data").textContent);
        const formatter = new Intl.NumberFormat("en-US");
        const scopeEntries = state.scopes;
        const status = document.getElementById("map-status");
        const mapTitle = document.getElementById("map-heading");
        const mapCaption = document.getElementById("map-caption");
        const coverageCopy = document.getElementById("coverage-copy");
        const requestList = document.getElementById("request-list");
        const form = document.getElementById("public-request-form");
        const formMessage = document.getElementById("form-message");
        const formType = document.getElementById("form-type");
        const titleInput = document.getElementById("title");
        const categoryInput = document.getElementById("category");
        const descriptionInput = document.getElementById("description");

        let map = null;
        let boundaryLayer = null;

        function setMapStatus(text) {
          status.innerHTML = '<span class="status-dot" aria-hidden="true"></span>' + text;
        }

        function initMap() {
          if (!window.L) {
            setMapStatus("Map library unavailable");
            return;
          }
          map = L.map("coverage-map", {
            center: [-37.3364293166475, -59.1819827896264],
            zoom: 9,
            scrollWheelZoom: false,
            zoomSnap: 0.25,
          });
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(map);
        }

        function boundaryStyle(scope) {
          const colors = {
            country: "#1d5b86",
            province: "#0f6b57",
            partido: "#b16b12",
            municipio: "#a83b2f",
          };
          return {
            color: colors[scope] || "#0f6b57",
            weight: scope === "country" ? 1.4 : 2.4,
            opacity: 0.95,
            fillColor: colors[scope] || "#0f6b57",
            fillOpacity: scope === "country" ? 0.08 : 0.14,
          };
        }

        function setActiveCrumb(scope) {
          document.querySelectorAll(".crumb").forEach((crumb) => {
            const active = crumb.getAttribute("data-scope") === scope;
            crumb.classList.toggle("is-active", active);
            crumb.setAttribute("aria-current", active ? "page" : "false");
          });
        }

        async function showScope(scope, options) {
          const config = scopeEntries[scope];
          if (!config || !map) return;
          const push = !options || options.push !== false;
          setActiveCrumb(scope);
          mapTitle.textContent = config.label;
          mapCaption.textContent = config.coverage;
          coverageCopy.textContent = config.coverage;
          setMapStatus("Loading boundary");

          try {
            const response = await fetch(config.href + "/__tenant/boundary/" + scope, {
              headers: { accept: "application/json" },
            });
            if (!response.ok) throw new Error("Boundary request failed");
            const payload = await response.json();
            if (boundaryLayer) {
              boundaryLayer.remove();
            }
            boundaryLayer = L.geoJSON(payload.geojson, {
              style: boundaryStyle(scope),
              onEachFeature: function (feature, layer) {
                const name = feature && feature.properties && (feature.properties.nombre_completo || feature.properties.nombre);
                if (name) layer.bindTooltip(String(name));
              },
            }).addTo(map);
            const bounds = boundaryLayer.getBounds();
            if (bounds.isValid()) {
              map.fitBounds(bounds, {
                padding: [24, 24],
                maxZoom: scope === "municipio" || scope === "partido" ? 10 : 7,
              });
            }
            setMapStatus("Boundary loaded");
            if (push && window.location.pathname !== config.href) {
              history.pushState({ scope: scope }, "", config.href);
            }
          } catch (error) {
            setMapStatus("Boundary unavailable");
            console.error(error);
          }
        }

        function requestStatusLabel(status) {
          return String(status || "received").replace(/_/g, " ");
        }

        function renderRequests(requests) {
          if (!Array.isArray(requests) || requests.length === 0) {
            requestList.innerHTML = '<div class="request-empty">No Tandil public records yet. The first submitted form will appear here after privacy filtering.</div>';
            return;
          }
          requestList.innerHTML = requests.slice(0, 6).map((item) => {
            const title = escapeHtml(item.publicTitle || "Public request");
            const summary = escapeHtml(item.publicSummary || "");
            const status = escapeHtml(requestStatusLabel(item.publicStatus));
            const category = escapeHtml(item.category || "other");
            const id = escapeHtml(item.publicId || "");
            return '<article class="request-item"><strong>' + title + '</strong><p class="request-empty">' + summary + '</p><div class="request-meta"><span class="tag">' + status + '</span><span>' + category + '</span><span translate="no">' + id + '</span></div></article>';
          }).join("");
        }

        function updateMetrics(requests) {
          if (!Array.isArray(requests)) return;
          const activeStatuses = new Set(["received", "triage", "routed", "in_progress", "waiting_on_city"]);
          const resolvedStatuses = new Set(["resolved", "closed"]);
          const active = requests.filter((item) => activeStatuses.has(item.publicStatus)).length;
          const resolved = requests.filter((item) => resolvedStatuses.has(item.publicStatus)).length;
          document.getElementById("metric-total").textContent = formatter.format(requests.length);
          document.getElementById("metric-active").textContent = formatter.format(active);
          document.getElementById("metric-resolved").textContent = formatter.format(resolved);
        }

        async function loadRequests() {
          try {
            const params = new URLSearchParams({
              institutionSlug: state.portalInstitutionSlug,
              q: "Tandil",
            });
            const response = await fetch("/api/public/requests?" + params.toString(), {
              headers: { accept: "application/json" },
            });
            if (!response.ok) throw new Error("Request feed unavailable");
            const requests = await response.json();
            renderRequests(requests);
            updateMetrics(requests);
          } catch (error) {
            requestList.innerHTML = '<div class="request-empty">Public records are unavailable right now. Forms can still be submitted.</div>';
          }
        }

        function applyTemplate(template) {
          formType.value = template;
          if (template === "attendance") {
            categoryInput.value = "other";
            titleInput.value = "Attendance record for Tandil public activity";
            descriptionInput.value = "Attendance context: ";
          } else if (template === "permit") {
            categoryInput.value = "permits";
            titleInput.value = "Permit or service question in Tandil";
            descriptionInput.value = "";
          } else {
            categoryInput.value = "infrastructure";
            titleInput.value = "";
            descriptionInput.value = "";
          }
          titleInput.focus();
        }

        function escapeHtml(value) {
          return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        }

        function setFormMessage(text, type) {
          formMessage.textContent = text;
          formMessage.className = "form-message" + (type ? " " + type : "");
        }

        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          setFormMessage("", "");

          const submitter = form.querySelector('button[type="submit"]');
          const data = new FormData(form);
          const contactName = String(data.get("contactName") || "").trim();
          const contactEmail = String(data.get("contactEmail") || "").trim();
          const submissionMode = contactEmail ? "guest" : "anonymous";

          if (contactEmail && !contactName) {
            setFormMessage("Add a contact name or clear the email field.", "error");
            document.getElementById("contact-name").focus();
            return;
          }

          const payload = {
            institutionSlug: state.portalInstitutionSlug,
            submissionMode: submissionMode,
            title: String(data.get("title") || "").trim(),
            description: String(data.get("description") || "").trim(),
            category: String(data.get("category") || "other"),
            locationLabel: String(data.get("location") || "Tandil, Provincia de Buenos Aires").trim(),
            locale: "es",
            sourcePath: window.location.pathname,
          };

          if (submissionMode === "guest") {
            payload.contactName = contactName;
            payload.contactEmail = contactEmail;
          }

          if (payload.title.length < 4 || payload.description.length < 12) {
            setFormMessage("Add a title and at least 12 characters of detail.", "error");
            return;
          }

          submitter.disabled = true;
          submitter.textContent = "Submitting...";

          try {
            const response = await fetch("/api/public/requests", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                accept: "application/json",
              },
              body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(result.error || "Submission failed");
            }
            form.reset();
            document.getElementById("location").value = "Tandil, Provincia de Buenos Aires";
            setFormMessage("Request published as " + result.publicId + (result.recoveryToken ? ". Recovery token: " + result.recoveryToken : "."), "success");
            await loadRequests();
          } catch (error) {
            setFormMessage(error instanceof Error ? error.message : "Submission failed. Try again.", "error");
          } finally {
            submitter.disabled = false;
            submitter.textContent = "Submit Tandil Request";
          }
        });

        document.querySelectorAll("[data-template]").forEach((button) => {
          button.addEventListener("click", () => applyTemplate(button.getAttribute("data-template")));
        });

        document.querySelectorAll(".crumb").forEach((crumb) => {
          crumb.addEventListener("click", (event) => {
            event.preventDefault();
            showScope(crumb.getAttribute("data-scope"), { push: true });
          });
        });

        window.addEventListener("popstate", () => {
          const scope = Object.keys(scopeEntries).find((key) => scopeEntries[key].href === window.location.pathname) || "municipio";
          showScope(scope, { push: false });
        });

        initMap();
        showScope(state.selectedScope, { push: false });
        loadRequests();
      })();
    </script>
  </body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__dispatcher/health") {
      return Response.json({ ok: true, mode: "tenant-public-site" });
    }

    const tenantRoute = parseTenantRoutePathname(url.pathname);
    if (!tenantRoute) {
      return fetch(proxyRequest(env.LANDING_ORIGIN, request, url.pathname));
    }

    const { tenant, selectedScope } = await resolveTenant(env, tenantRoute);
    if (!tenant) {
      return new Response("Tenant not found", { status: 404 });
    }

    return handleTenantRequest(request, env, tenant, tenantRoute, selectedScope);
  },
};
