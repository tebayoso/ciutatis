"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  FileSignature,
  Gauge,
  GitBranch,
  Globe2,
  Landmark,
  Lock,
  MapPin,
  Scale,
  ScrollText,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import RegionPage from "./region/RegionPage";
import {
  NAV_ROUTES,
  alternatePath,
  resolveRoute,
  routePath,
  type Locale,
  type PublicRoute,
  type RouteState,
} from "../lib/routes";

const adminShellUrl = process.env.NEXT_PUBLIC_ADMIN_SHELL_URL ?? "https://admin.ciutatis.com";

const copy = {
  en: {
    nav: {
      govops: "GovOps",
      scrutiny: "Public Scrutiny",
      portal: "Public Portal",
      features: "Features",
      "how-it-works": "How it works",
      "for-governments": "For governments",
      "for-citizens": "For citizens",
      home: "Home",
      region: "",
      github: "GitHub",
      signIn: "Sign in",
      langSwitch: "ES",
    },
    home: {
      eyebrow: "Open source GovOps",
      title: "The open source GovOps platform, fully powered by AI.",
      subtitle:
        "Ciutatis combines institution operations, AI-assisted execution, budget controls, and public accountability in one civic coordination platform.",
      ctaPrimary: "Explore GovOps",
      ctaSecondary: "How it works",
    },
    distinction: {
      eyebrow: "Two public surfaces, one platform",
      title: "Explore the data, or work with your government.",
      subtitle:
        "Ciutatis keeps two public surfaces deliberately separate: a read-only data explorer for accountability, and a portal where citizens act.",
      explore: {
        tag: "Public Scrutiny",
        title: "Explore public data",
        body: "A read-only data explorer. Search institutions and places, inspect public requests, and follow institutional activity — no account needed.",
        cta: "Explore public data",
      },
      act: {
        tag: "Public Portal",
        title: "Work with your government",
        body: "Find your institution, submit and track public requests, and claim or work with your government online.",
        cta: "Open the portal",
      },
    },
    govops: {
      eyebrow: "GovOps layer",
      title: "Run public institutions with operational clarity.",
      subtitle:
        "Bring departments, objectives, AI agents, budgets, approvals, and audit logs into one governable operating layer.",
      cards: [
        {
          eyebrow: "01 / Operations",
          title: "Institutional work control",
          description:
            "Tasks, objectives, agents, and departments stay connected so work keeps institutional context instead of becoming disconnected tickets.",
        },
        {
          eyebrow: "02 / Governance",
          title: "Approvals and boundaries",
          description:
            "Operator approval gates, company scoping, budget hard stops, and activity logs preserve institutional control.",
        },
        {
          eyebrow: "03 / AI execution",
          title: "AI-powered by design",
          description:
            "Use AI agents as accountable operational channels while Ciutatis manages ownership, cost, context, and traceability.",
        },
      ],
    },
    scrutiny: {
      eyebrow: "Public data explorer",
      title: "Explore public government data.",
      subtitle:
        "Public Scrutiny is a read-only explorer for civic accountability. Search public institutions and places, then open their public surface — kept separate from internal operations.",
      searchLabel: "Find public institutions",
      searchPlaceholder: "Search cities, governments, councils...",
      empty: "No public places or institutions found.",
      loading: "Searching public index...",
      error: "Could not load public search.",
      institutionKind: "Institution",
      placeKind: "Place",
      openPlace: "Open public site",
      openInstitution: "Open portal",
      liveTag: "Live",
      roadmapTag: "On the roadmap",
      live: {
        title: "Institution & place search",
        body: "Query the public index of institutions and places in real time and jump straight to their public surface.",
      },
      roadmap: [
        {
          title: "Public request feeds",
          body: "Browse the public requests an institution has received and how they are progressing.",
        },
        {
          title: "Activity & evidence",
          body: "Follow institutional activity and the evidence attached to public work as the public data APIs expand.",
        },
      ],
    },
    portal: {
      eyebrow: "Public portal",
      title: "Work with your government.",
      subtitle:
        "The Public Portal is where citizens act. Find your institution, submit and track public requests, and claim or work with your government online.",
      steps: [
        {
          title: "Find your institution",
          body: "Use Public Scrutiny to search the public index and open your city, council, or government's public page.",
        },
        {
          title: "Submit or track a request",
          body: "Open public requests and follow their status. Existing request links stay routable for recovery tokens and shared URLs.",
        },
        {
          title: "Claim your government",
          body: "Operators can claim an institution from its public page to start running it on the GovOps layer.",
        },
      ],
      cta: "Find your institution",
    },
    features: {
      eyebrow: "Features",
      title: "Everything Ciutatis does, in one platform.",
      subtitle:
        "An open source operating layer for public institutions, with a public layer for citizens — governed, auditable, and AI-powered by design.",
      groups: [
        {
          tag: "Operate",
          items: [
            { title: "Institutions & departments", body: "Model institutions, departments, and objectives so civic work keeps its structure and context." },
            { title: "Objectives & projects", body: "Drive work through objectives and projects with single-assignee ownership end to end." },
            { title: "Inbox & activity", body: "A working inbox and an activity timeline keep operators on top of what changed and why." },
          ],
        },
        {
          tag: "Govern",
          items: [
            { title: "Operator approvals", body: "Approval gates put a human in the loop before consequential actions execute." },
            { title: "Budgets & cost controls", body: "Track spend and enforce budget hard-stops so AI and operations stay within bounds." },
            { title: "Audit trails", body: "Every mutation is attributable and reviewable — auditable by default." },
          ],
        },
        {
          tag: "Automate",
          items: [
            { title: "Governed AI agents", body: "Run AI agents (Claude, Codex, Gemini, and more) as accountable, scoped operational channels." },
            { title: "Execution workspaces", body: "Give agents isolated workspaces with managed context, cost, and traceability." },
            { title: "Plugins", body: "Extend the platform with plugins that add surfaces and capabilities under the same governance." },
          ],
        },
        {
          tag: "Open up",
          items: [
            { title: "Public Scrutiny", body: "A read-only public data explorer for institutions and places — accountability without exposing internal operations." },
            { title: "Public Portal", body: "A citizen entry point to submit, track, and follow up on public requests." },
            { title: "Open source", body: "The whole platform is open source — inspect it, run it, and extend it." },
          ],
        },
      ],
    },
    howItWorks: {
      eyebrow: "How it works",
      title: "One accountable model, from objective to public record.",
      subtitle:
        "Ciutatis connects institutional structure, governed execution, and public visibility so civic work stays accountable end to end.",
      steps: [
        { eyebrow: "01", title: "Structure the institution", body: "Set up institutions, departments, and objectives. Work inherits institutional context instead of living in disconnected tickets." },
        { eyebrow: "02", title: "Execute with accountable channels", body: "Assign work to operators or governed AI agents. Single-assignee ownership keeps responsibility clear." },
        { eyebrow: "03", title: "Govern with approvals & budgets", body: "Approval gates, company scoping, and budget hard-stops keep consequential actions under control." },
        { eyebrow: "04", title: "Record everything", body: "Every action is logged and attributable, producing an audit trail that is reviewable by default." },
        { eyebrow: "05", title: "Publish a public layer", body: "Expose a read-only scrutiny explorer and a citizen portal — separate from internal operations, with enforced boundaries." },
      ],
    },
    forGovernments: {
      eyebrow: "For governments",
      title: "Operate with accountability, not just activity.",
      subtitle:
        "For public institutions and operators who need to coordinate real work, adopt AI safely, and stay accountable to the public.",
      points: [
        { title: "Coordinate real institutional work", body: "Departments, objectives, and projects keep work connected to institutional context — not scattered across tools." },
        { title: "Adopt AI without losing control", body: "AI agents act as scoped, accountable channels with managed cost, context, and traceability." },
        { title: "Enforce boundaries", body: "Operator approvals, company scoping, and budget hard-stops keep consequential actions inside guardrails." },
        { title: "Earn public trust", body: "Publish a trustworthy public layer that shows civic work without exposing internal operations." },
      ],
      cta: "See how it works",
    },
    forCitizens: {
      eyebrow: "For citizens",
      title: "Explore what your government does — and work with it.",
      subtitle:
        "Two public surfaces for citizens and watchdogs: explore public data, and act on it through the portal.",
      paths: [
        {
          tag: "Explore",
          title: "Public Scrutiny",
          body: "A read-only data explorer. Search public institutions and places and open their public surface — no account needed.",
          cta: "Explore public data",
          to: "scrutiny" as const,
        },
        {
          tag: "Act",
          title: "Public Portal",
          body: "Find your institution, submit and track public requests, and work with your government online.",
          cta: "Open the portal",
          to: "portal" as const,
        },
      ],
    },
    principles: {
      eyebrow: "Operating principles",
      cards: [
        { title: "Auditable by default", body: "Every mutation should be attributable, explainable, and reviewable." },
        { title: "Single-assignee execution", body: "Clear ownership keeps civic work from falling between bureaucratic cracks." },
        { title: "Strict authorization", body: "Public visibility and internal control remain separate layers with enforced boundaries." },
      ],
    },
    footer: "© 2026 Ciutatis. Open source civic infrastructure.",
  },
  es: {
    nav: {
      govops: "GovOps",
      scrutiny: "Escrutinio Público",
      portal: "Portal Público",
      features: "Funcionalidades",
      "how-it-works": "Cómo funciona",
      "for-governments": "Para gobiernos",
      "for-citizens": "Para ciudadanos",
      home: "Inicio",
      region: "",
      github: "GitHub",
      signIn: "Ingresar",
      langSwitch: "EN",
    },
    home: {
      eyebrow: "GovOps de código abierto",
      title: "La plataforma GovOps de código abierto, completamente impulsada por IA.",
      subtitle:
        "Ciutatis combina operaciones institucionales, ejecución asistida por IA, control presupuestario y rendición pública de cuentas en una plataforma de coordinación cívica.",
      ctaPrimary: "Explorar GovOps",
      ctaSecondary: "Cómo funciona",
    },
    distinction: {
      eyebrow: "Dos superficies públicas, una plataforma",
      title: "Explorá los datos, o trabajá con tu gobierno.",
      subtitle:
        "Ciutatis mantiene dos superficies públicas deliberadamente separadas: un explorador de datos de solo lectura para la rendición de cuentas, y un portal donde la ciudadanía actúa.",
      explore: {
        tag: "Escrutinio Público",
        title: "Explorá datos públicos",
        body: "Un explorador de datos de solo lectura. Buscá instituciones y lugares, inspeccioná pedidos públicos y seguí la actividad institucional — sin cuenta.",
        cta: "Explorar datos públicos",
      },
      act: {
        tag: "Portal Público",
        title: "Trabajá con tu gobierno",
        body: "Encontrá tu institución, enviá y seguí pedidos públicos, y reclamá o trabajá con tu gobierno en línea.",
        cta: "Abrir el portal",
      },
    },
    govops: {
      eyebrow: "Capa GovOps",
      title: "Operá instituciones públicas con claridad operativa.",
      subtitle:
        "Reuní departamentos, objetivos, agentes de IA, presupuestos, aprobaciones y auditoría en una sola capa operativa gobernable.",
      cards: [
        {
          eyebrow: "01 / Operaciones",
          title: "Control del trabajo institucional",
          description:
            "Tareas, objetivos, agentes y departamentos permanecen conectados para conservar contexto institucional.",
        },
        {
          eyebrow: "02 / Gobernanza",
          title: "Aprobaciones y límites",
          description:
            "Aprobaciones, alcance por institución, topes presupuestarios y registros de actividad preservan el control.",
        },
        {
          eyebrow: "03 / Ejecución IA",
          title: "Impulsado por IA desde el diseño",
          description:
            "Usá agentes de IA como canales operativos responsables mientras Ciutatis gestiona propiedad, costo, contexto y trazabilidad.",
        },
      ],
    },
    scrutiny: {
      eyebrow: "Explorador de datos públicos",
      title: "Explorá datos públicos del gobierno.",
      subtitle:
        "Escrutinio Público es un explorador de solo lectura para la rendición de cuentas. Buscá instituciones y lugares públicos y abrí su superficie pública — separada de la operación interna.",
      searchLabel: "Encontrar instituciones públicas",
      searchPlaceholder: "Buscar ciudades, gobiernos, concejos...",
      empty: "No se encontraron lugares o instituciones públicas.",
      loading: "Buscando en el índice público...",
      error: "No se pudo cargar la búsqueda pública.",
      institutionKind: "Institución",
      placeKind: "Lugar",
      openPlace: "Abrir sitio público",
      openInstitution: "Abrir portal",
      liveTag: "En vivo",
      roadmapTag: "En el roadmap",
      live: {
        title: "Búsqueda de instituciones y lugares",
        body: "Consultá el índice público de instituciones y lugares en tiempo real y entrá directo a su superficie pública.",
      },
      roadmap: [
        {
          title: "Flujos de pedidos públicos",
          body: "Explorá los pedidos públicos que recibió una institución y cómo avanzan.",
        },
        {
          title: "Actividad y evidencia",
          body: "Seguí la actividad institucional y la evidencia del trabajo público a medida que crecen las APIs de datos públicos.",
        },
      ],
    },
    portal: {
      eyebrow: "Portal público",
      title: "Trabajá con tu gobierno.",
      subtitle:
        "El Portal Público es donde la ciudadanía actúa. Encontrá tu institución, enviá y seguí pedidos públicos, y reclamá o trabajá con tu gobierno en línea.",
      steps: [
        {
          title: "Encontrá tu institución",
          body: "Usá Escrutinio Público para buscar en el índice y abrir la página pública de tu ciudad, concejo o gobierno.",
        },
        {
          title: "Enviá o seguí un pedido",
          body: "Abrí pedidos públicos y seguí su estado. Los enlaces de pedidos existentes siguen siendo accesibles para tokens de recuperación y URLs compartidas.",
        },
        {
          title: "Reclamá tu gobierno",
          body: "Los operadores pueden reclamar una institución desde su página pública para empezar a operarla en la capa GovOps.",
        },
      ],
      cta: "Encontrá tu institución",
    },
    features: {
      eyebrow: "Funcionalidades",
      title: "Todo lo que hace Ciutatis, en una plataforma.",
      subtitle:
        "Una capa operativa de código abierto para instituciones públicas, con una capa pública para la ciudadanía — gobernada, auditable e impulsada por IA.",
      groups: [
        {
          tag: "Operar",
          items: [
            { title: "Instituciones y áreas", body: "Modelá instituciones, áreas y objetivos para que el trabajo cívico conserve su estructura y contexto." },
            { title: "Objetivos y proyectos", body: "Impulsá el trabajo con objetivos y proyectos con responsable único de punta a punta." },
            { title: "Inbox y actividad", body: "Un inbox de trabajo y una línea de tiempo mantienen a los operadores al tanto de qué cambió y por qué." },
          ],
        },
        {
          tag: "Gobernar",
          items: [
            { title: "Aprobaciones de operador", body: "Las aprobaciones ponen una persona en el ciclo antes de ejecutar acciones consecuentes." },
            { title: "Presupuestos y control de costos", body: "Seguí el gasto y aplicá topes de presupuesto para que IA y operaciones se mantengan dentro de límites." },
            { title: "Auditoría", body: "Cada mutación es atribuible y revisable — auditable por defecto." },
          ],
        },
        {
          tag: "Automatizar",
          items: [
            { title: "Agentes de IA gobernados", body: "Ejecutá agentes de IA (Claude, Codex, Gemini y más) como canales operativos responsables y acotados." },
            { title: "Workspaces de ejecución", body: "Dales a los agentes workspaces aislados con contexto, costo y trazabilidad gestionados." },
            { title: "Plugins", body: "Extendé la plataforma con plugins que agregan superficies y capacidades bajo la misma gobernanza." },
          ],
        },
        {
          tag: "Abrir",
          items: [
            { title: "Escrutinio Público", body: "Un explorador público de datos de solo lectura para instituciones y lugares — rendición de cuentas sin exponer la operación interna." },
            { title: "Portal Público", body: "Un punto de entrada ciudadano para enviar, seguir y dar continuidad a pedidos públicos." },
            { title: "Código abierto", body: "Toda la plataforma es de código abierto — inspeccionala, ejecutala y extendela." },
          ],
        },
      ],
    },
    howItWorks: {
      eyebrow: "Cómo funciona",
      title: "Un modelo responsable, del objetivo al registro público.",
      subtitle:
        "Ciutatis conecta estructura institucional, ejecución gobernada y visibilidad pública para que el trabajo cívico sea responsable de extremo a extremo.",
      steps: [
        { eyebrow: "01", title: "Estructurá la institución", body: "Configurá instituciones, áreas y objetivos. El trabajo hereda contexto institucional en vez de vivir en tickets sueltos." },
        { eyebrow: "02", title: "Ejecutá con canales responsables", body: "Asigná trabajo a operadores o agentes de IA gobernados. El responsable único mantiene la responsabilidad clara." },
        { eyebrow: "03", title: "Goberná con aprobaciones y presupuestos", body: "Aprobaciones, alcance por institución y topes de presupuesto mantienen bajo control las acciones consecuentes." },
        { eyebrow: "04", title: "Registrá todo", body: "Cada acción queda registrada y es atribuible, produciendo una auditoría revisable por defecto." },
        { eyebrow: "05", title: "Publicá una capa pública", body: "Exponé un explorador de escrutinio de solo lectura y un portal ciudadano — separados de la operación interna, con límites aplicados." },
      ],
    },
    forGovernments: {
      eyebrow: "Para gobiernos",
      title: "Operá con rendición de cuentas, no solo con actividad.",
      subtitle:
        "Para instituciones públicas y operadores que necesitan coordinar trabajo real, adoptar IA de forma segura y rendir cuentas al público.",
      points: [
        { title: "Coordiná trabajo institucional real", body: "Áreas, objetivos y proyectos mantienen el trabajo conectado al contexto institucional — no disperso en herramientas." },
        { title: "Adoptá IA sin perder el control", body: "Los agentes de IA actúan como canales acotados y responsables con costo, contexto y trazabilidad gestionados." },
        { title: "Aplicá límites", body: "Aprobaciones de operador, alcance por institución y topes de presupuesto mantienen las acciones dentro de guardas." },
        { title: "Ganá confianza pública", body: "Publicá una capa pública confiable que muestra el trabajo cívico sin exponer la operación interna." },
      ],
      cta: "Ver cómo funciona",
    },
    forCitizens: {
      eyebrow: "Para ciudadanos",
      title: "Explorá lo que hace tu gobierno — y trabajá con él.",
      subtitle:
        "Dos superficies públicas para ciudadanía y observadores: explorar datos públicos, y actuar sobre ellos a través del portal.",
      paths: [
        {
          tag: "Explorar",
          title: "Escrutinio Público",
          body: "Un explorador de datos de solo lectura. Buscá instituciones y lugares públicos y abrí su superficie pública — sin cuenta.",
          cta: "Explorar datos públicos",
          to: "scrutiny" as const,
        },
        {
          tag: "Actuar",
          title: "Portal Público",
          body: "Encontrá tu institución, enviá y seguí pedidos públicos, y trabajá con tu gobierno en línea.",
          cta: "Abrir el portal",
          to: "portal" as const,
        },
      ],
    },
    principles: {
      eyebrow: "Principios operativos",
      cards: [
        { title: "Auditable por defecto", body: "Cada mutación debe ser atribuible, explicable y revisable." },
        { title: "Ejecución con responsable único", body: "La propiedad clara evita que el trabajo cívico se pierda entre áreas." },
        { title: "Autorización estricta", body: "Visibilidad pública y control interno son capas separadas con límites aplicados." },
      ],
    },
    footer: "© 2026 Ciutatis. Infraestructura cívica de código abierto.",
  },
} as const;

interface InstitutionResult {
  kind: "institution";
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brandColor: string | null;
  logoUrl: string | null;
  issuePrefix: string;
}

interface PlaceResult {
  kind: "place";
  id: string;
  name: string;
  municipalityName: string;
  countryCode: string;
  countryName: string | null;
  jurisdictionType: string;
  jurisdictionLabel: string;
  postalCode: string | null;
  citySlug: string;
  parentSubdivisionName: string | null;
  pathPrefix: string;
  url: string;
}

type SearchResult = InstitutionResult | PlaceResult;

export default function PublicApp({ initialRouteState }: { initialRouteState: RouteState }) {
  const [{ locale, route, regionPath }, setRouteState] = useState<RouteState>(initialRouteState);

  useEffect(() => {
    setRouteState(resolveRoute(window.location.pathname));
  }, []);

  const altPath = alternatePath(locale, route);

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--ink)] font-sans selection:bg-[var(--accent-soft)] selection:text-slate-900">
      <div className="h-1 w-full bg-[var(--ink)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(196,169,98,0.05),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0)_0%,#fdfcfb_100%)]" />
      <Header locale={locale} route={route} alternatePath={altPath} />
      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-20 pt-10 sm:px-6 lg:px-12 lg:pb-32 lg:pt-24">
        {route === "home" ? <HomePage locale={locale} /> : null}
        {route === "govops" ? <GovOpsPage locale={locale} /> : null}
        {route === "scrutiny" ? <ScrutinyPage locale={locale} /> : null}
        {route === "portal" ? <PortalPage locale={locale} /> : null}
        {route === "features" ? <FeaturesPage locale={locale} /> : null}
        {route === "how-it-works" ? <HowItWorksPage locale={locale} /> : null}
        {route === "for-governments" ? <ForGovernmentsPage locale={locale} /> : null}
        {route === "for-citizens" ? <ForCitizensPage locale={locale} /> : null}
        {route === "region" && regionPath ? <RegionPage locale={locale} pathPrefix={regionPath} /> : null}
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

function Header({ locale, route, alternatePath }: { locale: Locale; route: PublicRoute; alternatePath: string }) {
  const t = copy[locale];
  const links = NAV_ROUTES.map((r) => ({ route: r, label: t.nav[r] }));

  return (
    <header className="mx-auto flex w-full max-w-7xl flex-col gap-4 border-b border-[var(--border)] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-12 lg:py-8">
      <a href={routePath(locale, "home")} className="flex items-center gap-3 text-sm uppercase tracking-[0.2em] text-[var(--ink)] font-serif">
        <Landmark className="h-5 w-5 text-[var(--accent)]" />
        <span className="font-semibold">Ciutatis</span>
      </a>
      <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-6">
        <nav className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted-strong)]">
          {links.map((link) => (
            <a key={link.route} href={routePath(locale, link.route)} className={route === link.route ? "font-semibold text-[var(--ink)]" : "transition-colors hover:text-[var(--ink)]"}>
              {link.label}
            </a>
          ))}
        </nav>
        <a href={alternatePath} className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-strong)] transition-colors hover:text-[var(--ink)]">
          {t.nav.langSwitch}
        </a>
        <a className="hidden text-sm font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--ink)] sm:block" href="https://github.com/tebayoso/ciutatis" target="_blank" rel="noreferrer">
          {t.nav.github}
        </a>
      </div>
    </header>
  );
}

function SiteFooter({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const groups: Array<Exclude<PublicRoute, "region" | "home">> = [
    "features",
    "how-it-works",
    "for-governments",
    "for-citizens",
    "govops",
    "scrutiny",
    "portal",
  ];
  return (
    <footer className="w-full border-t border-[var(--border)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-12">
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-[var(--muted-strong)]">
          {groups.map((r) => (
            <a key={r} href={routePath(locale, r)} className="transition-colors hover:text-[var(--ink)]">
              {t.nav[r]}
            </a>
          ))}
          <a href="https://github.com/tebayoso/ciutatis" target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--ink)]">
            {t.nav.github}
          </a>
          <a href={`${adminShellUrl}/admin/auth`} className="transition-colors hover:text-[var(--ink)]">
            {t.nav.signIn}
          </a>
        </nav>
        <p className="text-center text-xs uppercase tracking-widest text-[var(--muted)] font-medium">{t.footer}</p>
      </div>
    </footer>
  );
}

function HomePage({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <>
      <Hero
        eyebrow={t.home.eyebrow}
        title={t.home.title}
        subtitle={t.home.subtitle}
        icon={<Scale className="h-3.5 w-3.5 text-[var(--accent)]" />}
        primary={{ href: routePath(locale, "govops"), label: t.home.ctaPrimary }}
        secondary={{ href: routePath(locale, "how-it-works"), label: t.home.ctaSecondary }}
      />
      <Divider />
      <PublicSurfaces locale={locale} />
      <Divider />
      <GovOpsPage locale={locale} compact />
    </>
  );
}

function PublicSurfaces({ locale }: { locale: Locale }) {
  const t = copy[locale].distinction;
  return (
    <section className="space-y-10">
      <SectionIntro eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="service-card group flex flex-col">
          <p className="mb-4 inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            <BarChart3 className="h-4 w-4" /> {t.explore.tag}
          </p>
          <h3 className="text-2xl font-medium text-[var(--ink)] font-serif">{t.explore.title}</h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted-strong)]">{t.explore.body}</p>
          <a className="hero-button mt-6 w-fit" href={routePath(locale, "scrutiny")}>
            {t.explore.cta}
            <ArrowRight className="h-4 w-4" />
          </a>
        </article>
        <article className="service-card group flex flex-col">
          <p className="mb-4 inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            <Landmark className="h-4 w-4" /> {t.act.tag}
          </p>
          <h3 className="text-2xl font-medium text-[var(--ink)] font-serif">{t.act.title}</h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted-strong)]">{t.act.body}</p>
          <a className="hero-button-solid mt-6 w-fit" href={routePath(locale, "portal")}>
            {t.act.cta}
            <ArrowRight className="h-4 w-4" />
          </a>
        </article>
      </div>
    </section>
  );
}

function GovOpsPage({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const t = copy[locale];
  return (
    <section className="space-y-16">
      {!compact ? (
        <Hero eyebrow={t.govops.eyebrow} title={t.govops.title} subtitle={t.govops.subtitle} icon={<Building2 className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      ) : (
        <SectionIntro eyebrow={t.govops.eyebrow} title={t.govops.title} subtitle={t.govops.subtitle} />
      )}
      <div className="grid gap-8 lg:grid-cols-3">
        {t.govops.cards.map((card, index) => (
          <article key={card.title} className="service-card group">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">{card.eyebrow}</p>
            {index === 0 ? <FileSignature className="mb-4 h-6 w-6 text-[var(--ink)] opacity-80" /> : null}
            {index === 1 ? <Lock className="mb-4 h-6 w-6 text-[var(--ink)] opacity-80" /> : null}
            {index === 2 ? <Globe2 className="mb-4 h-6 w-6 text-[var(--ink)] opacity-80" /> : null}
            <h3 className="text-xl font-medium text-[var(--ink)] font-serif">{card.title}</h3>
            <div className="my-4 h-[1px] w-12 bg-[var(--accent)] opacity-50 transition-all duration-500 ease-out group-hover:w-full" />
            <p className="text-sm leading-relaxed text-[var(--muted-strong)]">{card.description}</p>
          </article>
        ))}
      </div>
      {!compact ? <Principles locale={locale} /> : null}
    </section>
  );
}

function ScrutinyPage({ locale }: { locale: Locale }) {
  const t = copy[locale].scrutiny;
  return (
    <section className="space-y-16">
      <Hero eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} icon={<BarChart3 className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      <div>
        <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--success)]">
          <span className="rounded-full border border-[var(--border-strong)] bg-white/60 px-3 py-1">{t.liveTag}</span>
          <span className="text-[var(--muted-strong)]">{t.live.title}</span>
        </div>
        <InstitutionSearch locale={locale} />
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-[var(--muted-strong)]">{t.live.body}</p>
      </div>
      <div>
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{t.roadmapTag}</p>
        <div className="grid gap-8 lg:grid-cols-2">
          {t.roadmap.map((card) => (
            <article key={card.title} className="service-card">
              <h3 className="text-xl font-medium text-[var(--ink)] font-serif">{card.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-[var(--muted-strong)]">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PortalPage({ locale }: { locale: Locale }) {
  const t = copy[locale].portal;
  return (
    <section className="space-y-12">
      <Hero eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} icon={<Landmark className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      <div className="grid gap-8 lg:grid-cols-3">
        {t.steps.map((step, index) => (
          <article key={step.title} className="service-card group">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">{`0${index + 1}`}</p>
            {index === 0 ? <Search className="mb-4 h-6 w-6 text-[var(--ink)] opacity-80" /> : null}
            {index === 1 ? <ScrollText className="mb-4 h-6 w-6 text-[var(--ink)] opacity-80" /> : null}
            {index === 2 ? <FileSignature className="mb-4 h-6 w-6 text-[var(--ink)] opacity-80" /> : null}
            <h3 className="text-xl font-medium text-[var(--ink)] font-serif">{step.title}</h3>
            <div className="my-4 h-[1px] w-12 bg-[var(--accent)] opacity-50 transition-all duration-500 ease-out group-hover:w-full" />
            <p className="text-sm leading-relaxed text-[var(--muted-strong)]">{step.body}</p>
          </article>
        ))}
      </div>
      <div className="flex justify-center">
        <a className="hero-button-solid" href={routePath(locale, "scrutiny")}>
          {t.cta}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

function FeaturesPage({ locale }: { locale: Locale }) {
  const t = copy[locale].features;
  return (
    <section className="space-y-16">
      <Hero eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} icon={<Gauge className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      <div className="space-y-14">
        {t.groups.map((group) => (
          <div key={group.tag} className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-start">
            <div className="lg:sticky lg:top-12">
              <h2 className="text-2xl font-normal tracking-tight text-[var(--ink)] font-serif">{group.tag}</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <article key={item.title} className="principle-card">
                  <CheckCircle2 className="mb-4 h-5 w-5 text-[var(--accent)]" />
                  <h3 className="text-base font-medium text-[var(--ink)] font-serif">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorksPage({ locale }: { locale: Locale }) {
  const t = copy[locale].howItWorks;
  return (
    <section className="space-y-16">
      <Hero eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} icon={<GitBranch className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      <ol className="mx-auto w-full max-w-3xl space-y-6">
        {t.steps.map((step) => (
          <li key={step.eyebrow} className="service-card flex gap-5">
            <span className="font-serif text-2xl font-medium text-[var(--accent)]">{step.eyebrow}</span>
            <div>
              <h3 className="text-xl font-medium text-[var(--ink)] font-serif">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ForGovernmentsPage({ locale }: { locale: Locale }) {
  const t = copy[locale].forGovernments;
  const icons = [Building2, ShieldCheck, Lock, Globe2];
  return (
    <section className="space-y-16">
      <Hero eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} icon={<ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      <div className="grid gap-8 sm:grid-cols-2">
        {t.points.map((point, index) => {
          const Icon = icons[index] ?? CheckCircle2;
          return (
            <article key={point.title} className="service-card">
              <Icon className="mb-4 h-6 w-6 text-[var(--ink)] opacity-80" />
              <h3 className="text-xl font-medium text-[var(--ink)] font-serif">{point.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">{point.body}</p>
            </article>
          );
        })}
      </div>
      <div className="flex justify-center">
        <a className="hero-button-solid" href={routePath(locale, "how-it-works")}>
          {t.cta}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

function ForCitizensPage({ locale }: { locale: Locale }) {
  const t = copy[locale].forCitizens;
  return (
    <section className="space-y-12">
      <Hero eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} icon={<Users className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      <div className="grid gap-6 lg:grid-cols-2">
        {t.paths.map((path) => (
          <article key={path.to} className="service-card flex flex-col">
            <p className="mb-4 inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              {path.to === "scrutiny" ? <BarChart3 className="h-4 w-4" /> : <Landmark className="h-4 w-4" />} {path.tag}
            </p>
            <h3 className="text-2xl font-medium text-[var(--ink)] font-serif">{path.title}</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted-strong)]">{path.body}</p>
            <a className={`${path.to === "portal" ? "hero-button-solid" : "hero-button"} mt-6 w-fit`} href={routePath(locale, path.to)}>
              {path.cta}
              <ArrowRight className="h-4 w-4" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function InstitutionSearch({ locale }: { locale: Locale }) {
  const t = copy[locale].scrutiny;
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/public/search${params.size ? `?${params.toString()}` : ""}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Public search failed");
        setResults((await response.json()) as SearchResult[]);
      } catch (searchError) {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const status = useMemo(() => {
    if (loading) return t.loading;
    if (error) return t.error;
    if (results.length === 0) return t.empty;
    return null;
  }, [error, loading, results.length, t.empty, t.error, t.loading]);

  return (
    <section className="mx-auto w-full max-w-4xl rounded-2xl border border-[var(--border)] bg-white/80 p-6 shadow-sm sm:p-8">
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]" htmlFor="institution-search">
        {t.searchLabel}
      </label>
      <input
        id="institution-search"
        className="mt-4 w-full rounded border border-[var(--border-strong)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--accent)]"
        placeholder={t.searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {status ? <p className="mt-4 text-sm text-[var(--muted-strong)]">{status}</p> : null}
      <div className="mt-6 grid gap-4">
        {results.map((result) => (
          <a key={`${result.kind}:${result.id}`} href={result.kind === "institution" ? `/portal/${result.slug}` : result.url} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {result.kind === "institution" ? <Landmark className="h-3.5 w-3.5 text-[var(--accent)]" /> : <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />}
                  <span>{result.kind === "institution" ? t.institutionKind : t.placeKind}</span>
                  <span aria-hidden="true">/</span>
                  <span>{result.kind === "institution" ? result.issuePrefix : result.jurisdictionLabel}</span>
                </p>
                <h3 className="mt-1 text-xl font-medium font-serif">{result.name}</h3>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--accent)]" />
            </div>
            {result.kind === "institution" ? (
              result.description ? <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">{result.description}</p> : null
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">
                {[result.municipalityName, result.parentSubdivisionName, result.countryName ?? result.countryCode.toUpperCase()].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              {result.kind === "institution" ? t.openInstitution : t.openPlace}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

function Hero({ eyebrow, title, subtitle, icon, primary, secondary }: { eyebrow: string; title: string; subtitle: string; icon: React.ReactNode; primary?: { href: string; label: string }; secondary?: { href: string; label: string } }) {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center space-y-7 text-center sm:space-y-10">
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)] backdrop-blur-md">
        {icon}
        {eyebrow}
      </div>
      <h1 className="text-4xl font-normal leading-tight text-[var(--ink)] sm:text-5xl md:text-7xl font-serif">{title}</h1>
      <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted-strong)] md:text-xl font-serif">{subtitle}</p>
      {(primary || secondary) ? (
        <div className="flex w-full flex-col items-stretch justify-center gap-3 pt-4 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          {primary ? <a className="hero-button-solid" href={primary.href}>{primary.label}<ArrowRight className="h-4 w-4" /></a> : null}
          {secondary ? <a className="ghost-button" href={secondary.href}>{secondary.label}</a> : null}
        </div>
      ) : null}
    </section>
  );
}

function SectionIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="text-3xl font-normal tracking-tight text-[var(--ink)] md:text-4xl font-serif">{title}</h2>
      <p className="max-w-2xl text-base leading-relaxed text-[var(--muted-strong)] font-serif">{subtitle}</p>
    </div>
  );
}

function Principles({ locale }: { locale: Locale }) {
  const t = copy[locale].principles;
  return (
    <section className="grid gap-12 border-t border-[var(--border)] pt-16 lg:grid-cols-[1fr_2fr] lg:items-start">
      <div className="lg:sticky lg:top-12">
        <h2 className="text-2xl font-normal tracking-tight text-[var(--ink)] font-serif">{t.eyebrow}</h2>
      </div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {t.cards.map((principle) => (
          <article key={principle.title} className="principle-card">
            <CheckCircle2 className="mb-4 h-5 w-5 text-[var(--accent)]" />
            <h3 className="text-base font-medium text-[var(--ink)] font-serif">{principle.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">{principle.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Divider() {
  return <div className="mx-auto my-16 h-[1px] w-full max-w-3xl bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent lg:my-32" />;
}
