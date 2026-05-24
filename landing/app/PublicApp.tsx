"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileSignature,
  Globe2,
  Landmark,
  Lock,
  MapPin,
  Scale,
  Search,
} from "lucide-react";

type Locale = "en" | "es";
type PublicRoute = "home" | "govops" | "scrutiny" | "portal";
type RouteState = { locale: Locale; route: PublicRoute };

const adminShellUrl = process.env.NEXT_PUBLIC_ADMIN_SHELL_URL ?? "https://admin.ciutatis.com";

const copy = {
  en: {
    nav: {
      govops: "GovOps",
      scrutiny: "Public Scrutiny",
      portal: "Public Portal",
      github: "GitHub",
      admin: "Open admin shell",
      langSwitch: "ES",
    },
    home: {
      eyebrow: "Open source GovOps",
      title: "The open source GovOps platform, fully powered by AI.",
      subtitle:
        "Ciutatis combines institution operations, AI-assisted execution, budget controls, and public accountability in one civic coordination platform.",
      ctaPrimary: "Explore GovOps",
      ctaSecondary: "View Public Scrutiny",
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
      eyebrow: "Public scrutiny layer",
      title: "Make civic work discoverable and inspectable.",
      subtitle:
        "Citizens and watchdogs need a public surface for institutions, requests, progress, and evidence. Ciutatis keeps that layer separate from internal operations.",
      searchLabel: "Find public institutions",
      searchPlaceholder: "Search cities, governments, councils...",
      empty: "No public places or institutions found.",
      loading: "Searching public index...",
      error: "Could not load public search.",
      institutionKind: "Institution",
      placeKind: "Place",
      openPlace: "Open public site",
      openInstitution: "Open portal",
    },
    portal: {
      eyebrow: "Public portal",
      title: "Public requests and institution portals live here.",
      subtitle:
        "The Next public app owns the public portal entrypoint. Request detail URLs remain preserved for recovery tokens and public links.",
    },
    principles: {
      eyebrow: "Operating principles",
      cards: [
        {
          title: "Auditable by default",
          body: "Every mutation should be attributable, explainable, and reviewable.",
        },
        {
          title: "Single-assignee execution",
          body: "Clear ownership keeps civic work from falling between bureaucratic cracks.",
        },
        {
          title: "Strict authorization",
          body: "Public visibility and internal control remain separate layers with enforced boundaries.",
        },
      ],
    },
    footer: "© 2026 Ciutatis. Open source civic infrastructure.",
  },
  es: {
    nav: {
      govops: "GovOps",
      scrutiny: "Escrutinio Público",
      portal: "Portal Público",
      github: "GitHub",
      admin: "Abrir panel de control",
      langSwitch: "EN",
    },
    home: {
      eyebrow: "GovOps de código abierto",
      title: "La plataforma GovOps de código abierto, completamente impulsada por IA.",
      subtitle:
        "Ciutatis combina operaciones institucionales, ejecución asistida por IA, control presupuestario y rendición pública de cuentas en una plataforma de coordinación cívica.",
      ctaPrimary: "Explorar GovOps",
      ctaSecondary: "Ver Escrutinio Público",
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
      eyebrow: "Capa de escrutinio público",
      title: "Hacé el trabajo cívico visible e inspeccionable.",
      subtitle:
        "Ciudadanos y observadores necesitan una superficie pública para instituciones, pedidos, avances y evidencia, separada de la operación interna.",
      searchLabel: "Encontrar instituciones públicas",
      searchPlaceholder: "Buscar ciudades, gobiernos, concejos...",
      empty: "No se encontraron lugares o instituciones públicas.",
      loading: "Buscando en el índice público...",
      error: "No se pudo cargar la búsqueda pública.",
      institutionKind: "Institución",
      placeKind: "Lugar",
      openPlace: "Abrir sitio público",
      openInstitution: "Abrir portal",
    },
    portal: {
      eyebrow: "Portal público",
      title: "Los pedidos públicos y portales institucionales viven acá.",
      subtitle:
        "La app pública Next controla la entrada al portal. Las URLs de detalle se preservan para tokens de recuperación y enlaces públicos.",
    },
    principles: {
      eyebrow: "Principios operativos",
      cards: [
        {
          title: "Auditable por defecto",
          body: "Cada mutación debe ser atribuible, explicable y revisable.",
        },
        {
          title: "Ejecución con responsable único",
          body: "La propiedad clara evita que el trabajo cívico se pierda entre áreas.",
        },
        {
          title: "Autorización estricta",
          body: "Visibilidad pública y control interno son capas separadas con límites aplicados.",
        },
      ],
    },
    footer: "© 2026 Ciutatis. Infraestructura cívica de código abierto.",
  },
};

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

function resolvePublicRoute(pathname: string): { locale: Locale; route: PublicRoute } {
  if (pathname.startsWith("/es")) {
    if (pathname === "/es/escrutinio") return { locale: "es", route: "scrutiny" };
    if (pathname === "/es/govops") return { locale: "es", route: "govops" };
    if (pathname.startsWith("/es/portal")) return { locale: "es", route: "portal" };
    return { locale: "es", route: "home" };
  }

  if (pathname === "/scrutiny" || pathname === "/en/scrutiny") return { locale: "en", route: "scrutiny" };
  if (pathname === "/govops" || pathname === "/en/govops") return { locale: "en", route: "govops" };
  if (pathname.startsWith("/portal") || pathname.startsWith("/en/portal")) return { locale: "en", route: "portal" };
  return { locale: "en", route: "home" };
}

function routePath(locale: Locale, route: PublicRoute) {
  if (locale === "es") {
    if (route === "home") return "/es";
    if (route === "scrutiny") return "/es/escrutinio";
    if (route === "portal") return "/es/portal";
    return "/es/govops";
  }

  if (route === "home") return "/en";
  if (route === "portal") return "/portal";
  return `/${route}`;
}

export default function PublicApp({ initialRouteState }: { initialRouteState: RouteState }) {
  const [{ locale, route }, setRouteState] = useState<RouteState>(initialRouteState);

  useEffect(() => {
    setRouteState(resolvePublicRoute(window.location.pathname));
  }, []);

  const t = copy[locale];
  const alternateLocale: Locale = locale === "en" ? "es" : "en";
  const alternatePath = routePath(alternateLocale, route === "scrutiny" ? "scrutiny" : route);

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--ink)] font-sans selection:bg-[var(--accent-soft)] selection:text-slate-900">
      <div className="h-1 w-full bg-[var(--ink)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(196,169,98,0.05),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0)_0%,#fdfcfb_100%)]" />
      <Header locale={locale} route={route} alternatePath={alternatePath} />
      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-20 pt-10 sm:px-6 lg:px-12 lg:pb-32 lg:pt-24">
        {route === "home" ? <HomePage locale={locale} /> : null}
        {route === "govops" ? <GovOpsPage locale={locale} /> : null}
        {route === "scrutiny" ? <ScrutinyPage locale={locale} /> : null}
        {route === "portal" ? <PortalPage locale={locale} /> : null}
      </main>
      <footer className="w-full border-t border-[var(--border)] py-8 text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-medium">{t.footer}</p>
      </footer>
    </div>
  );
}

function Header({ locale, route, alternatePath }: { locale: Locale; route: PublicRoute; alternatePath: string }) {
  const t = copy[locale];
  const links: Array<{ route: PublicRoute; label: string }> = [
    { route: "govops", label: t.nav.govops },
    { route: "scrutiny", label: t.nav.scrutiny },
    { route: "portal", label: t.nav.portal },
  ];

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
        <a className="hero-button min-w-0 flex-1 sm:flex-none" href={`${adminShellUrl}/auth`}>
          {t.nav.admin}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </header>
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
        secondary={{ href: routePath(locale, "scrutiny"), label: t.home.ctaSecondary }}
      />
      <Divider />
      <GovOpsPage locale={locale} compact />
    </>
  );
}

function GovOpsPage({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const t = copy[locale];
  return (
    <section className={compact ? "space-y-16" : "space-y-16"}>
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
      <Principles locale={locale} />
    </section>
  );
}

function ScrutinyPage({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <section className="space-y-16">
      <Hero eyebrow={t.scrutiny.eyebrow} title={t.scrutiny.title} subtitle={t.scrutiny.subtitle} icon={<Search className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      <InstitutionSearch locale={locale} />
      <div className="grid gap-8 lg:grid-cols-3">
        {["Public requests", "Progress evidence", "Audit trail"].map((title) => (
          <article key={title} className="service-card">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">Coming soon</p>
            <h3 className="text-xl font-medium text-[var(--ink)] font-serif">{title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted-strong)]">This placeholder keeps the scrutiny layer visible while public data views are wired behind stable APIs.</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PortalPage({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <section className="space-y-10">
      <Hero eyebrow={t.portal.eyebrow} title={t.portal.title} subtitle={t.portal.subtitle} icon={<Landmark className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-white/70 p-8 text-center shadow-sm">
        <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
          Use Public Scrutiny to find an institution, then open its public portal. Existing request URLs under <code className="rounded bg-[var(--panel-strong)] px-1.5 py-0.5">/portal/requests/:publicId</code> remain routable in this public Next app.
        </p>
        <a className="hero-button-solid mt-6" href={routePath(locale, "scrutiny")}>Find institutions</a>
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
