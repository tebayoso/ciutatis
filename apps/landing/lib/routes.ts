// Single source of truth for the public site's routes. Imported by the client
// PublicApp, the server page.tsx, site-meta, and the sitemap so locale/path
// resolution, nav, and indexability can't drift between them.

export type Locale = "en" | "es";
export type PublicRoute =
  | "home"
  | "govops"
  | "scrutiny"
  | "explore"
  | "portal"
  | "collaborate"
  | "features"
  | "how-it-works"
  | "for-governments"
  | "for-citizens"
  | "account"
  | "region";

export type RouteState = { locale: Locale; route: PublicRoute; regionPath?: string };

type RouteDef = {
  // Canonical localized paths. English canonical paths omit the /en prefix
  // (with /en/* kept as aliases), Spanish paths carry /es.
  en: string;
  es: string;
  // Shown in the top navigation (order in this table is nav order).
  nav: boolean;
  // Marketing/content page: in the sitemap and indexable. App/utility pages
  // (e.g. account) are excluded from the sitemap and get robots noindex.
  indexable: boolean;
};

const ROUTES: Record<Exclude<PublicRoute, "region">, RouteDef> = {
  home: { en: "/en", es: "/es", nav: false, indexable: true },
  govops: { en: "/govops", es: "/es/govops", nav: true, indexable: true },
  scrutiny: { en: "/scrutiny", es: "/es/escrutinio", nav: true, indexable: true },
  explore: { en: "/explore", es: "/es/explorar", nav: true, indexable: true },
  portal: { en: "/portal", es: "/es/portal", nav: true, indexable: true },
  collaborate: { en: "/collaborate", es: "/es/colaborar", nav: true, indexable: true },
  features: { en: "/features", es: "/es/funcionalidades", nav: true, indexable: true },
  "how-it-works": { en: "/how-it-works", es: "/es/como-funciona", nav: false, indexable: true },
  "for-governments": { en: "/for-governments", es: "/es/para-gobiernos", nav: false, indexable: true },
  "for-citizens": { en: "/for-citizens", es: "/es/para-ciudadanos", nav: false, indexable: true },
  account: { en: "/account", es: "/es/cuenta", nav: false, indexable: false },
};

export const CONTENT_ROUTES = Object.keys(ROUTES) as Array<Exclude<PublicRoute, "region">>;

// Derived views of the registry (kept as named exports for existing callers).
export const ROUTE_PATHS: Record<Exclude<PublicRoute, "region">, { en: string; es: string }> = ROUTES;

export const NAV_ROUTES = CONTENT_ROUTES.filter(
  (route): route is Exclude<PublicRoute, "region" | "home"> => ROUTES[route].nav,
);

export function isIndexableRoute(route: Exclude<PublicRoute, "region">): boolean {
  return ROUTES[route].indexable;
}

export function routePath(locale: Locale, route: Exclude<PublicRoute, "region">): string {
  return ROUTES[route][locale];
}

// Every localized path plus /en/* aliases — used by page.tsx to prerender all
// content pages without hand-listing slugs.
export function allLocalizedPaths(): string[] {
  const paths = new Set<string>(["/"]);
  for (const route of CONTENT_ROUTES) {
    paths.add(ROUTES[route].en);
    paths.add(ROUTES[route].es);
    if (route !== "home") paths.add(`/en${ROUTES[route].en}`);
  }
  return [...paths];
}

function normalize(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function isRegionPath(pathname: string): boolean {
  return /^\/[a-z]{2}\/[a-z-]+\/[a-z0-9-]+$/.test(pathname);
}

// Build an exact path -> {locale, route} lookup from the table.
const EXACT_LOOKUP: Record<string, { locale: Locale; route: Exclude<PublicRoute, "region"> }> = (() => {
  const map: Record<string, { locale: Locale; route: Exclude<PublicRoute, "region"> }> = {};
  for (const route of CONTENT_ROUTES) {
    map[ROUTES[route].en] = { locale: "en", route };
    map[ROUTES[route].es] = { locale: "es", route };
    // /en/* alias for English canonical paths (e.g. /en/govops -> govops).
    if (route !== "home") map[`/en${ROUTES[route].en}`] = { locale: "en", route };
  }
  map["/"] = { locale: "en", route: "home" };
  return map;
})();

export function resolveRoute(pathname: string): RouteState {
  const path = normalize(pathname);

  if (isRegionPath(path)) {
    return { locale: path.startsWith("/es") ? "es" : "en", route: "region", regionPath: path };
  }

  const exact = EXACT_LOOKUP[path];
  if (exact) return { locale: exact.locale, route: exact.route };

  // Portal sub-paths (e.g. /portal/requests/:publicId, /es/portal/...) keep the portal route.
  if (path.startsWith("/es/portal")) return { locale: "es", route: "portal" };
  if (path.startsWith("/portal") || path.startsWith("/en/portal")) return { locale: "en", route: "portal" };

  return { locale: path.startsWith("/es") ? "es" : "en", route: "home" };
}

// The alternate-locale path for a given route (used for hreflang + the language switch).
export function alternatePath(locale: Locale, route: PublicRoute): string {
  const other: Locale = locale === "en" ? "es" : "en";
  if (route === "region") return "/"; // region pages localize via their own path
  return routePath(other, route);
}
