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
        "Ciutatis is the open source, AI-powered GovOps platform: run institutional operations, govern AI execution with approvals and budgets, and keep a public layer for citizens to explore data and work with their government.",
    },
    es: {
      title: "Plataforma GovOps de código abierto para instituciones públicas",
      description:
        "Ciutatis es la plataforma GovOps de código abierto impulsada por IA: operá instituciones, goberná la ejecución con aprobaciones y presupuestos, y ofrecé una capa pública para explorar datos y trabajar con el gobierno.",
    },
  },
  govops: {
    en: {
      title: "GovOps — run public institutions with operational clarity",
      description:
        "Bring departments, objectives, AI agents, budgets, approvals, and audit logs into one governable operating layer for public institutions.",
    },
    es: {
      title: "GovOps — operá instituciones públicas con claridad",
      description:
        "Reuní departamentos, objetivos, agentes de IA, presupuestos, aprobaciones y auditoría en una sola capa operativa gobernable para instituciones públicas.",
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
  features: {
    en: {
      title: "Features — what Ciutatis does",
      description:
        "Institutional work control, governed AI execution, budget hard-stops, operator approvals, audit trails, and a public scrutiny + portal layer — in one open source platform.",
    },
    es: {
      title: "Funcionalidades — qué hace Ciutatis",
      description:
        "Control del trabajo institucional, ejecución de IA gobernada, topes de presupuesto, aprobaciones de operador, auditoría y una capa pública de escrutinio y portal — en una plataforma de código abierto.",
    },
  },
  "how-it-works": {
    en: {
      title: "How it works — the Ciutatis operating model",
      description:
        "How institutions, departments, objectives, AI agents, approvals, and the public layers fit together to keep civic work accountable end to end.",
    },
    es: {
      title: "Cómo funciona — el modelo operativo de Ciutatis",
      description:
        "Cómo encajan instituciones, departamentos, objetivos, agentes de IA, aprobaciones y las capas públicas para mantener el trabajo cívico responsable de extremo a extremo.",
    },
  },
  "for-governments": {
    en: {
      title: "For governments — operate with accountability",
      description:
        "For public institutions and operators: coordinate departments and objectives, use AI as an accountable channel, enforce budgets and approvals, and publish a trustworthy public layer.",
    },
    es: {
      title: "Para gobiernos — operá con rendición de cuentas",
      description:
        "Para instituciones públicas y operadores: coordiná áreas y objetivos, usá IA como canal responsable, aplicá presupuestos y aprobaciones, y publicá una capa pública confiable.",
    },
  },
  "for-citizens": {
    en: {
      title: "For citizens — explore data and work with your government",
      description:
        "For citizens and watchdogs: explore public government data through Public Scrutiny, and submit, track, and follow up on requests through the Public Portal.",
    },
    es: {
      title: "Para ciudadanos — explorá datos y trabajá con tu gobierno",
      description:
        "Para ciudadanos y observadores: explorá datos públicos en Escrutinio Público, y enviá, seguí y dale continuidad a pedidos desde el Portal Público.",
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
