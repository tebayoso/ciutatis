// Shared, server-safe route table + resolver for the public site. Imported by
// both the client PublicApp and the server page.tsx/sitemap so locale/path
// resolution can't drift between them.

export type Locale = "en" | "es";
export type PublicRoute =
  | "home"
  | "govops"
  | "scrutiny"
  | "portal"
  | "features"
  | "how-it-works"
  | "for-governments"
  | "for-citizens"
  | "region";

export type RouteState = { locale: Locale; route: PublicRoute; regionPath?: string };

// Canonical localized paths. English canonical paths omit the /en prefix
// (with /en/* kept as aliases), Spanish paths carry /es.
export const ROUTE_PATHS: Record<Exclude<PublicRoute, "region">, { en: string; es: string }> = {
  home: { en: "/en", es: "/es" },
  govops: { en: "/govops", es: "/es/govops" },
  scrutiny: { en: "/scrutiny", es: "/es/escrutinio" },
  portal: { en: "/portal", es: "/es/portal" },
  features: { en: "/features", es: "/es/funcionalidades" },
  "how-it-works": { en: "/how-it-works", es: "/es/como-funciona" },
  "for-governments": { en: "/for-governments", es: "/es/para-gobiernos" },
  "for-citizens": { en: "/for-citizens", es: "/es/para-ciudadanos" },
};

export const CONTENT_ROUTES = Object.keys(ROUTE_PATHS) as Array<Exclude<PublicRoute, "region">>;

// Pages exposed in the top navigation (order matters).
export const NAV_ROUTES: Array<Exclude<PublicRoute, "region" | "home">> = [
  "govops",
  "scrutiny",
  "portal",
  "features",
];

export function routePath(locale: Locale, route: Exclude<PublicRoute, "region">): string {
  return ROUTE_PATHS[route][locale];
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
    map[ROUTE_PATHS[route].en] = { locale: "en", route };
    map[ROUTE_PATHS[route].es] = { locale: "es", route };
    // /en/* alias for English canonical paths (e.g. /en/govops -> govops).
    if (route !== "home") map[`/en${ROUTE_PATHS[route].en}`] = { locale: "en", route };
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
