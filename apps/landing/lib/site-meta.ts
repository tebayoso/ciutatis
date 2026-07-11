import type { Metadata } from "next";
import { CONTENT_ROUTES, ROUTE_PATHS, isIndexableRoute, routePath, type Locale, type PublicRoute } from "./routes";

export const SITE_URL = "https://ciutatis.com";
export const SITE_NAME = "Ciutatis";

type Meta = { title: string; description: string };

// Per-route SEO copy. Kept server-safe (no client deps) so generateMetadata can
// read it. Descriptions describe what EXISTS today; roadmap stays out of meta.
export const ROUTE_META: Record<Exclude<PublicRoute, "region">, Record<Locale, Meta>> = {
  home: {
    en: {
      title: "Open source GovOps platform for public institutions",
      description:
        "Ciutatis is the open source, AI-powered GovOps platform: run institutional operations, govern AI execution with approvals and budgets, and keep a public layer for citizens to explore data, contribute documents, and work with their government.",
    },
    es: {
      title: "Plataforma GovOps de código abierto para instituciones públicas",
      description:
        "Ciutatis es la plataforma GovOps de código abierto impulsada por IA: operá instituciones, goberná la ejecución con aprobaciones y presupuestos, y ofrecé una capa pública para explorar datos, aportar documentos y trabajar con el gobierno.",
    },
  },
  govops: {
    en: {
      title: "GovOps — operate, govern, and automate public institutions",
      description:
        "Ciutatis GovOps: institutional work control, approvals and budgets, governed AI agents, operating principles, feature inventory, and how the model works end to end for public institutions.",
    },
    es: {
      title: "GovOps — operá, goberná y automatizá instituciones públicas",
      description:
        "GovOps de Ciutatis: control del trabajo institucional, aprobaciones y presupuestos, agentes de IA gobernados, principios operativos, funcionalidades y cómo funciona el modelo de extremo a extremo.",
    },
  },
  scrutiny: {
    en: {
      title: "Public Scrutiny — explore public government data",
      description:
        "A public data explorer for civic accountability: search institutions and places, inspect public requests, and follow institutional activity. Read-only and separate from internal operations.",
    },
    es: {
      title: "Escrutinio Público — explorá datos públicos del gobierno",
      description:
        "Un explorador de datos públicos para la rendición de cuentas: buscá instituciones y lugares, inspeccioná pedidos públicos y seguí la actividad institucional. Solo lectura, separado de la operación interna.",
    },
  },
  explore: {
    en: {
      title: "Explore — civic map of institutions and places",
      description:
        "Search cities, municipalities, and public institutions on an interactive OpenStreetMap view: see administrative boundaries, what's already on Ciutatis, and claim places that aren't yet.",
    },
    es: {
      title: "Explorá — mapa cívico de instituciones y lugares",
      description:
        "Buscá ciudades, municipios e instituciones públicas en un mapa interactivo de OpenStreetMap: mirá límites administrativos, qué ya está en Ciutatis y reclamá los lugares que faltan.",
    },
  },
  portal: {
    en: {
      title: "Public Portal — work with your government",
      description:
        "The citizen entry point: find your institution, submit and track public requests, and claim or work with your government online.",
    },
    es: {
      title: "Portal Público — trabajá con tu gobierno",
      description:
        "El punto de entrada ciudadano: encontrá tu institución, enviá y seguí pedidos públicos, y reclamá o trabajá con tu gobierno en línea.",
    },
  },
  collaborate: {
    en: {
      title: "Collaborate — contribute public documents",
      description:
        "Drop a public government document and Ciutatis checks whether we already have it, then parses and processes new ones — extracting agencies, money, dates, and ordinances into searchable, grounded data.",
    },
    es: {
      title: "Colaborá — aportá documentos públicos",
      description:
        "Subí un documento público del gobierno y Ciutatis verifica si ya lo tenemos; los nuevos se analizan y procesan — extrayendo organismos, montos, fechas y ordenanzas en datos buscables y verificables.",
    },
  },
  argentina: {
    en: {
      title: "Argentina — civic map of provinces, municipios and localities",
      description:
        "Browse Argentina's complete administrative topography on Ciutatis: 24 provinces, 529 departamentos, 2,082 municipios and 4,037 localities — searchable, mapped, and ready to claim.",
    },
    es: {
      title: "Argentina — mapa cívico de provincias, municipios y localidades",
      description:
        "Explorá la topografía administrativa completa de Argentina en Ciutatis: 24 provincias, 529 departamentos, 2.082 municipios y 4.037 localidades — buscables, mapeadas y listas para reclamar.",
    },
  },
  account: {
    en: {
      title: "Your account",
      description:
        "Sign in or create a free citizen account to track the public requests you submit and the documents you contribute to Ciutatis.",
    },
    es: {
      title: "Tu cuenta",
      description:
        "Ingresá o creá una cuenta ciudadana gratuita para seguir los pedidos públicos que enviás y los documentos que aportás a Ciutatis.",
    },
  },
};

export function getRouteMeta(locale: Locale, route: Exclude<PublicRoute, "region">): Meta {
  return ROUTE_META[route][locale];
}

// Build Next Metadata for a route: localized title/description, canonical,
// hreflang alternates (en/es + x-default), Open Graph/Twitter, and robots
// noindex for non-indexable app pages (single source: the route registry).
export function buildMetadata(locale: Locale, route: Exclude<PublicRoute, "region">): Metadata {
  const meta = getRouteMeta(locale, route);
  const canonical = routePath(locale, route);
  const enPath = ROUTE_PATHS[route].en;
  const esPath = ROUTE_PATHS[route].es;
  return {
    ...(isIndexableRoute(route) ? {} : { robots: { index: false, follow: false } }),
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical,
      languages: {
        en: enPath,
        es: esPath,
        "x-default": enPath,
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: `${SITE_URL}${canonical}`,
      title: meta.title,
      description: meta.description,
      locale: locale === "es" ? "es_ES" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  };
}

// All canonical localized URLs for indexable routes, with hreflang alternates.
// The sitemap derives entirely from the route registry.
export type SitemapEntry = { url: string; languages: Record<string, string> };

export function allRouteUrls(): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const route of CONTENT_ROUTES) {
    if (!isIndexableRoute(route)) continue;
    const { en, es } = ROUTE_PATHS[route];
    const languages = {
      en: SITE_URL + en,
      es: SITE_URL + es,
      "x-default": SITE_URL + (route === "home" ? "/" : en),
    };
    entries.push({ url: SITE_URL + (route === "home" ? "/" : en), languages });
    entries.push({ url: SITE_URL + es, languages });
    if (route === "home") entries.push({ url: SITE_URL + en, languages });
  }
  return entries;
}
