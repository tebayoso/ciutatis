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
  | "argentina"
  | "account"
  | "region";

export type RouteState = { locale: Locale; route: PublicRoute; regionPath?: string };

type RouteDef = {
  // Canonical localized paths. English canonical paths omit the /en prefix
  // (with /en/* kept as aliases), Spanish paths carry /es.
  en: string;
  es: string;
  // Marketing/content page: in the sitemap and indexable. App/utility pages
  // (e.g. account) are excluded from the sitemap and get robots noindex.
  indexable: boolean;
};

const ROUTES: Record<Exclude<PublicRoute, "region">, RouteDef> = {
  home: { en: "/en", es: "/es", indexable: true },
  govops: { en: "/govops", es: "/es/govops", indexable: true },
  scrutiny: { en: "/scrutiny", es: "/es/escrutinio", indexable: true },
  explore: { en: "/explore", es: "/es/explorar", indexable: true },
  portal: { en: "/portal", es: "/es/portal", indexable: true },
  collaborate: { en: "/collaborate", es: "/es/colaborar", indexable: true },
  // Country hub for the Argentine geo index; one canonical URL for both locales.
  argentina: { en: "/ar", es: "/ar", indexable: true },
  account: { en: "/account", es: "/es/cuenta", indexable: false },
};

export const CONTENT_ROUTES = Object.keys(ROUTES) as Array<Exclude<PublicRoute, "region">>;

// Derived views of the registry (kept as named exports for existing callers).
export const ROUTE_PATHS: Record<Exclude<PublicRoute, "region">, { en: string; es: string }> = ROUTES;

export function isIndexableRoute(route: Exclude<PublicRoute, "region">): boolean {
  return ROUTES[route].indexable;
}

export function routePath(locale: Locale, route: Exclude<PublicRoute, "region">): string {
  return ROUTES[route][locale];
}

/** Section anchors on consolidated pages (used by nav dropdowns + deep links). */
export type SectionAnchor =
  | { route: "govops"; hash: "how-it-works" | "features" | "for-governments" }
  | { route: "home"; hash: "for-citizens" };

export function sectionHref(locale: Locale, section: SectionAnchor): string {
  return `${routePath(locale, section.route)}#${section.hash}`;
}

export type NavLabelKey =
  | "govops"
  | "scrutiny"
  | "explore"
  | "portal"
  | "collaborate"
  | "features"
  | "how-it-works"
  | "for-governments"
  | "for-citizens"
  | "argentina";

export type NavItem =
  | { kind: "link"; route: Exclude<PublicRoute, "region" | "home" | "account">; labelKey: NavLabelKey }
  | { kind: "section"; section: SectionAnchor; labelKey: NavLabelKey };

export type NavGroup = {
  id: "product" | "public";
  labelKey: "product" | "public";
  items: NavItem[];
};

/** Concise topbar: two dropdowns + Argentina. Order is intentional. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "product",
    labelKey: "product",
    items: [
      { kind: "link", route: "govops", labelKey: "govops" },
      { kind: "section", section: { route: "govops", hash: "how-it-works" }, labelKey: "how-it-works" },
      { kind: "section", section: { route: "govops", hash: "features" }, labelKey: "features" },
      { kind: "section", section: { route: "govops", hash: "for-governments" }, labelKey: "for-governments" },
    ],
  },
  {
    id: "public",
    labelKey: "public",
    items: [
      { kind: "link", route: "scrutiny", labelKey: "scrutiny" },
      { kind: "link", route: "explore", labelKey: "explore" },
      { kind: "link", route: "portal", labelKey: "portal" },
      { kind: "link", route: "collaborate", labelKey: "collaborate" },
      { kind: "section", section: { route: "home", hash: "for-citizens" }, labelKey: "for-citizens" },
    ],
  },
];

export const NAV_TOP_LINKS: Array<Exclude<PublicRoute, "region" | "home" | "account">> = ["argentina"];

/**
 * Former marketing URLs permanently redirected into core pages.
 * Kept here so next.config, docs, and resolveRoute stay aligned.
 * Destination is the consolidated page (no hash — HTTP redirects cannot rely on fragments).
 */
export const LEGACY_REDIRECTS: Array<{
  sources: string[];
  destination: string;
}> = [
  {
    sources: ["/features", "/en/features"],
    destination: "/govops",
  },
  {
    sources: ["/es/funcionalidades"],
    destination: "/es/govops",
  },
  {
    sources: ["/how-it-works", "/en/how-it-works"],
    destination: "/govops",
  },
  {
    sources: ["/es/como-funciona"],
    destination: "/es/govops",
  },
  {
    sources: ["/for-governments", "/en/for-governments"],
    destination: "/govops",
  },
  {
    sources: ["/es/para-gobiernos"],
    destination: "/es/govops",
  },
  {
    sources: ["/for-citizens", "/en/for-citizens"],
    destination: "/",
  },
  {
    sources: ["/es/para-ciudadanos"],
    destination: "/es",
  },
];

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

export function navItemHref(locale: Locale, item: NavItem): string {
  if (item.kind === "link") return routePath(locale, item.route);
  return sectionHref(locale, item.section);
}

export function isNavItemActive(route: PublicRoute, item: NavItem, hash?: string): boolean {
  if (item.kind === "link") return route === item.route;
  if (route !== item.section.route) return false;
  // Section items only highlight when the URL hash matches (avoids marking
  // "Public" active on every home visit via #for-citizens).
  return Boolean(hash && hash === item.section.hash);
}

export function isNavGroupActive(route: PublicRoute, group: NavGroup): boolean {
  return group.items.some((item) => item.kind === "link" && item.route === route);
}
