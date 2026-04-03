import { useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "@/lib/router";
import { ArrowRight, Building2, CheckCircle2, Landmark, Scale, ShieldCheck, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

type Locale = "en" | "es";

type LandingContent = {
  metaTitle: string;
  metaDescription: string;
  nav: {
    mark: string;
    languageLabel: string;
    alternatePath: string;
    alternateLabel: string;
    github: string;
    signIn: string;
  };
  hero: {
    eyebrow: string;
    strapline: string;
    title: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
    proof: string[];
  };
  audience: {
    eyebrow: string;
    title: string;
    body: string;
    groups: Array<{
      title: string;
      body: string;
    }>;
  };
  positioning: {
    eyebrow: string;
    title: string;
    body: string;
  };
  pillars: Array<{
    eyebrow: string;
    title: string;
    body: string;
  }>;
  operatingModel: {
    eyebrow: string;
    title: string;
    body: string;
    steps: Array<{
      label: string;
      title: string;
      body: string;
    }>;
  };
  productTruth: {
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
  };
  close: {
    title: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
  };
  footer: string;
};

const CONTENT: Record<Locale, LandingContent> = {
  en: {
    metaTitle: "Ciutatis — The civic operating system for public institutions",
    metaDescription:
      "Ciutatis is the civic operating system for institutions that need governance, approvals, budget control, execution visibility, and city-scale deployment discipline.",
    nav: {
      mark: "Ciutatis",
      languageLabel: "Language",
      alternatePath: "/es",
      alternateLabel: "ES",
      github: "GitHub",
      signIn: "Enter admin shell",
    },
    hero: {
      eyebrow: "Civic operating system",
      strapline: "Structured control for institutions that cannot afford ambiguity.",
      title: "Govern institutions with structure, not improvisation.",
      body:
        "Ciutatis is the public-sector control plane for governing work, approvals, budgets, and execution across institutional teams and city-specific runtimes. It gives operators one place to decide what matters, who acts, what changed, and how every action is accounted for.",
      primaryCta: "Enter the admin shell",
      secondaryCta: "See how it works",
      proof: [
        "Audit visibility for every mutation",
        "Approval gates for governed actions",
        "Budget hard-stops before costs drift",
      ],
    },
    audience: {
      eyebrow: "Who it is for",
      title: "A public operating surface for serious institutional work.",
      body:
        "Ciutatis is meant for environments where public decisions, operational follow-through, and budget visibility need to remain legible to leadership, operators, and future reviewers at the same time.",
      groups: [
        {
          title: "City and institutional leadership",
          body: "See what requires approval, what is moving, and where intervention is needed without collapsing governance into email chains and improvised reporting.",
        },
        {
          title: "Operators and implementation teams",
          body: "Run work with clear assignees, explicit state, and controlled handoffs so execution remains supervised instead of becoming opaque once tasks leave a meeting.",
        },
        {
          title: "Multi-city deployment teams",
          body: "Provision each city or institution as a distinct runtime with its own routing identity and lifecycle while preserving central oversight in the company shell.",
        },
      ],
    },
    positioning: {
      eyebrow: "What Ciutatis is",
      title: "Not another dashboard. A civic command structure made operational.",
      body:
        "Most software tracks tasks after the institution has already fragmented. Ciutatis starts higher up: mission, authority, approvals, budget discipline, execution context, and tenant-specific city deployments. It turns administrative complexity into an operating model that can actually be supervised.",
    },
    pillars: [
      {
        eyebrow: "01 · Governance",
        title: "Approval is built into the workflow, not bolted on after the fact.",
        body:
          "High-consequence actions stay governed. Ciutatis keeps approvals, overrides, and responsibility in the same system as execution so political and operational control do not drift apart.",
      },
      {
        eyebrow: "02 · Accountability",
        title: "Every action has an owner, a reason, and a trace.",
        body:
          "Single-assignee execution, activity logging, and explicit status transitions create the kind of clarity public institutions need when decisions must be explained later.",
      },
      {
        eyebrow: "03 · Deployment",
        title: "One company shell, many city runtimes.",
        body:
          "Ciutatis is evolving toward a dedicated public landing, an internal company shell, and provisioned tenant instances such as ciutatis.com/ar/tandil-abc—so onboarding a new city becomes a repeatable operational act.",
      },
    ],
    operatingModel: {
      eyebrow: "Operating model",
      title: "How the system is structured",
      body:
        "The public experience, the institutional shell, and each tenant runtime serve different responsibilities. That separation makes the platform easier to trust, easier to operate, and easier to scale city by city.",
      steps: [
        {
          label: "Public layer",
          title: "A credible front door for cities, institutions, and operators.",
          body:
            "The landing experience explains the model, frames the institutional promise, and routes decision-makers into the right entry point without exposing internal complexity.",
        },
        {
          label: "Company shell",
          title: "The place where support, provisioning, and governance stay under control.",
          body:
            "The admin shell is where Ciutatis operators manage onboarding, defaults, tickets, tenant configuration, and strategic oversight across deployments.",
        },
        {
          label: "Tenant runtime",
          title: "A dedicated operating surface for each city or institution.",
          body:
            "Each tenant can carry its own routing identity, status, and deployment lifecycle without collapsing back into a single generic workspace.",
        },
      ],
    },
    productTruth: {
      eyebrow: "Why it matters",
      title: "Public trust requires operational clarity.",
      body:
        "Ciutatis is designed for environments where ambiguity is expensive. It favors explicit control, visible accountability, and durable operating boundaries over theatrical productivity claims.",
      points: [
        "One operator can see what is running, what is blocked, and what requires intervention.",
        "Institutional work remains legible because every task traces back to a larger objective.",
        "Tenant instances are treated as deployable civic systems, not just records in a table.",
      ],
    },
    close: {
      title: "Built for institutions that need seriousness in the loop.",
      body:
        "If your work touches policy, approvals, public accountability, or multi-city rollout, Ciutatis gives you a cleaner operating surface than improvised stacks ever will.",
      primaryCta: "Open the admin shell",
      secondaryCta: "Read the code on GitHub",
    },
    footer: "Open-source civic infrastructure for governed execution.",
  },
  es: {
    metaTitle: "Ciutatis — El sistema operativo cívico para instituciones públicas",
    metaDescription:
      "Ciutatis es el sistema operativo cívico para instituciones que necesitan gobernanza, aprobaciones, control presupuestario, visibilidad de ejecución y disciplina de despliegue a escala de ciudad.",
    nav: {
      mark: "Ciutatis",
      languageLabel: "Idioma",
      alternatePath: "/en",
      alternateLabel: "EN",
      github: "GitHub",
      signIn: "Entrar al panel institucional",
    },
    hero: {
      eyebrow: "Sistema operativo cívico",
      strapline: "Control estructurado para instituciones que no pueden permitirse la ambigüedad.",
      title: "Gobierne instituciones con estructura, no con improvisación.",
      body:
        "Ciutatis es la capa de control para el sector público cuando la gobernanza, las aprobaciones, el presupuesto y la ejecución deben convivir en un mismo sistema. Da a los operadores un solo lugar para decidir qué importa, quién actúa, qué cambió y cómo queda registrado cada movimiento.",
      primaryCta: "Entrar al panel institucional",
      secondaryCta: "Ver cómo funciona",
      proof: [
        "Trazabilidad completa de cada mutación",
        "Puertas de aprobación para acciones gobernadas",
        "Límites presupuestarios antes de que el costo se desordene",
      ],
    },
    audience: {
      eyebrow: "Para quién es",
      title: "Una superficie operativa pública para trabajo institucional serio.",
      body:
        "Ciutatis está pensado para entornos donde las decisiones públicas, la ejecución y la visibilidad presupuestaria deben seguir siendo legibles al mismo tiempo para conducción, operadores y revisores futuros.",
      groups: [
        {
          title: "Conducción política e institucional",
          body: "Permite ver qué requiere aprobación, qué está avanzando y dónde hace falta intervenir sin convertir la gobernanza en cadenas de correo o reportes improvisados.",
        },
        {
          title: "Operadores y equipos de implementación",
          body: "Ordena la ejecución con responsables claros, estados explícitos y transferencias controladas para que el trabajo no se vuelva opaco apenas sale de una reunión.",
        },
        {
          title: "Equipos de despliegue multi-ciudad",
          body: "Hace posible aprovisionar cada ciudad o institución como un runtime distinto, con identidad de ruteo y ciclo de vida propios, sin perder supervisión central.",
        },
      ],
    },
    positioning: {
      eyebrow: "Qué es Ciutatis",
      title: "No es otro tablero. Es una estructura cívica convertida en operación.",
      body:
        "La mayoría del software organiza tareas cuando la institución ya está fragmentada. Ciutatis empieza más arriba: misión, autoridad, aprobaciones, disciplina presupuestaria, contexto de ejecución y despliegues por ciudad. Convierte la complejidad administrativa en un modelo operativo que realmente puede supervisarse.",
    },
    pillars: [
      {
        eyebrow: "01 · Gobernanza",
        title: "La aprobación vive dentro del flujo, no llega tarde como parche.",
        body:
          "Las acciones de mayor consecuencia permanecen gobernadas. Ciutatis mantiene aprobaciones, excepciones y responsabilidad dentro del mismo sistema donde ocurre la ejecución.",
      },
      {
        eyebrow: "02 · Responsabilidad",
        title: "Cada acción tiene dueño, motivo y registro.",
        body:
          "La ejecución con asignación única, el log de actividad y los estados explícitos crean la claridad que una institución pública necesita cuando después debe explicar lo ocurrido.",
      },
      {
        eyebrow: "03 · Despliegue",
        title: "Un panel institucional, múltiples runtimes por ciudad.",
        body:
          "Ciutatis está evolucionando hacia una landing pública, un panel institucional interno y runtimes inquilinos aprovisionados como ciutatis.com/ar/tandil-abc, para que incorporar una nueva ciudad sea un acto operativo repetible.",
      },
    ],
    operatingModel: {
      eyebrow: "Modelo operativo",
      title: "Cómo se organiza el sistema",
      body:
        "La experiencia pública, el panel institucional y cada runtime inquilino cumplen responsabilidades distintas. Esa separación vuelve a la plataforma más confiable, más gobernable y más fácil de escalar ciudad por ciudad.",
      steps: [
        {
          label: "Capa pública",
          title: "Una puerta de entrada creíble para ciudades, instituciones y operadores.",
          body:
            "La landing explica el modelo, ordena la promesa institucional y dirige a cada actor hacia el punto de entrada correcto sin exponer complejidad interna.",
        },
        {
          label: "Panel institucional",
          title: "El lugar donde soporte, aprovisionamiento y gobernanza siguen bajo control.",
          body:
            "El panel interno es donde el equipo de Ciutatis gestiona onboarding, configuraciones base, tickets, tenants y supervisión estratégica entre despliegues.",
        },
        {
          label: "Runtime inquilino",
          title: "Una superficie operativa dedicada para cada ciudad o institución.",
          body:
            "Cada tenant puede tener identidad de ruteo, estado y ciclo de despliegue propios sin colapsar de nuevo en un espacio genérico y único para todos.",
        },
      ],
    },
    productTruth: {
      eyebrow: "Por qué importa",
      title: "La confianza pública exige claridad operativa.",
      body:
        "Ciutatis está diseñado para entornos donde la ambigüedad sale cara. Favorece control explícito, responsabilidad visible y límites de operación duraderos por encima de promesas vacías de productividad.",
      points: [
        "Un operador puede ver qué está corriendo, qué está bloqueado y dónde debe intervenir.",
        "El trabajo institucional se mantiene legible porque cada tarea se conecta con un objetivo superior.",
        "Los tenants se tratan como sistemas cívicos desplegables, no como simples filas dentro de una tabla.",
      ],
    },
    close: {
      title: "Hecho para instituciones que necesitan seriedad dentro del ciclo operativo.",
      body:
        "Si su trabajo toca política pública, aprobaciones, trazabilidad o despliegues multi-ciudad, Ciutatis ofrece una superficie operativa mucho más clara que cualquier stack improvisado.",
      primaryCta: "Abrir el panel institucional",
      secondaryCta: "Leer el código en GitHub",
    },
    footer: "Infraestructura cívica de código abierto para ejecución gobernada.",
  },
};

function resolveLocale(pathname: string): Locale {
  if (pathname === "/es" || pathname.startsWith("/es/")) return "es";
  return "en";
}

function upsertMeta(name: string, content: string) {
  let element = document.head.querySelector(`meta[name="${name}"]`);
  if (!(element instanceof HTMLMetaElement)) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
  let element = document.head.querySelector(selector);
  if (!(element instanceof HTMLLinkElement)) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    if (hreflang) {
      element.setAttribute("hreflang", hreflang);
    }
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

export function Landing() {
  const location = useLocation();
  const locale = useMemo(() => resolveLocale(location.pathname), [location.pathname]);
  const content = CONTENT[locale];
  const { theme, setTheme } = useTheme();
  const previousThemeRef = useRef<typeof theme | null>(null);
  const previousLangRef = useRef<string | null>(null);
  const previousTitleRef = useRef<string | null>(null);
  const previousDescriptionRef = useRef<string | null>(null);

  useEffect(() => {
    previousThemeRef.current = theme;
    if (theme !== "light") {
      setTheme("light");
    }

    return () => {
      const previousTheme = previousThemeRef.current;
      if (previousTheme && previousTheme !== "light") {
        setTheme(previousTheme);
      }
    };
  }, [setTheme]);

  useEffect(() => {
    if (previousLangRef.current === null) {
      previousLangRef.current = document.documentElement.lang;
    }
    if (previousTitleRef.current === null) {
      previousTitleRef.current = document.title;
    }
    if (previousDescriptionRef.current === null) {
      const currentDescription = document.head.querySelector('meta[name="description"]');
      previousDescriptionRef.current = currentDescription instanceof HTMLMetaElement ? currentDescription.content : null;
    }

    document.documentElement.lang = locale;
    document.title = content.metaTitle;

    const origin = window.location.origin;
    const canonicalPath = locale === "es" ? "/es" : "/en";

    upsertMeta("description", content.metaDescription);
    upsertMeta("theme-color", "#fcfbf7");
    upsertLink("canonical", `${origin}${canonicalPath}`);
    upsertLink("alternate", `${origin}/en`, "en");
    upsertLink("alternate", `${origin}/es`, "es");

    return () => {
      if (previousLangRef.current !== null) {
        document.documentElement.lang = previousLangRef.current;
      }
      if (previousTitleRef.current !== null) {
        document.title = previousTitleRef.current;
      }
      if (previousDescriptionRef.current !== null) {
        upsertMeta("description", previousDescriptionRef.current);
      }
      const canonical = document.head.querySelector('link[rel="canonical"]');
      if (canonical instanceof HTMLLinkElement) {
        canonical.remove();
      }
      document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((node) => node.remove());
    };
  }, [content.metaDescription, content.metaTitle, locale]);

  return (
    <div className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,#f7f3ea_0%,#fcfbf7_42%,#f3eee3_100%)] text-stone-900 selection:bg-amber-200/70">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <header className="sticky top-0 z-40 border-b border-stone-300/70 bg-[rgba(252,251,247,0.88)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3 text-stone-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white/80 shadow-[0_8px_30px_rgba(120,113,108,0.08)]">
                <Landmark className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <div className="font-serif text-lg font-semibold tracking-[0.08em]">{content.nav.mark}</div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-stone-500">{content.hero.eyebrow}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-stone-500 sm:flex">
                <span>{content.nav.languageLabel}</span>
                <Link className="font-semibold text-stone-900 transition-colors hover:text-amber-700" to={content.nav.alternatePath}>
                  {content.nav.alternateLabel}
                </Link>
              </div>
              <a
                className="hidden text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 sm:inline-flex"
                href="https://github.com/tebayoso/ciutatis"
                target="_blank"
                rel="noreferrer"
              >
                {content.nav.github}
              </a>
              <Button asChild className="rounded-none border border-stone-900 bg-stone-900 px-4 text-xs uppercase tracking-[0.18em] text-white hover:bg-stone-800 sm:px-5">
                <Link to="/auth">{content.nav.signIn}</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="pb-24 pt-10 sm:pt-14 lg:pb-32">
          <section className="grid gap-14 border-b border-stone-300/70 pb-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-18 lg:pb-24">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 border border-stone-300 bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.26em] text-stone-600 shadow-[0_14px_40px_rgba(120,113,108,0.08)]">
                <Scale className="h-3.5 w-3.5 text-amber-700" />
                {content.hero.eyebrow}
              </div>

              <div className="space-y-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-stone-500">{content.hero.strapline}</p>
                <h1 className="max-w-4xl font-serif text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-stone-950 md:text-7xl">
                  {content.hero.title}
                </h1>
                <p className="max-w-2xl font-serif text-xl leading-9 text-stone-700 md:text-2xl">
                  {content.hero.body}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-none border border-stone-900 bg-stone-900 px-6 py-6 text-xs uppercase tracking-[0.22em] text-white hover:bg-stone-800">
                  <Link to="/auth">
                    {content.hero.primaryCta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <a
                  className="inline-flex items-center rounded-none border border-stone-400 bg-white/70 px-6 py-6 text-xs font-medium uppercase tracking-[0.22em] text-stone-700 transition-colors hover:border-stone-700 hover:text-stone-950"
                  href="#operating-model"
                >
                  {content.hero.secondaryCta}
                </a>
              </div>
            </div>

            <aside className="relative overflow-hidden border border-stone-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(245,239,227,0.92)_100%)] p-7 shadow-[0_30px_80px_rgba(120,113,108,0.12)]">
              <div className="absolute inset-y-0 left-0 w-px bg-[linear-gradient(180deg,transparent,#b45309,transparent)] opacity-55" />
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#b45309,transparent)] opacity-55" />
              <div className="space-y-6">
                <div className="space-y-3 border-b border-stone-300/70 pb-5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Ciutatis</p>
                  <p className="font-serif text-2xl leading-tight text-stone-900">
                    {content.positioning.title}
                  </p>
                </div>

                <div className="space-y-4">
                  {content.hero.proof.map((item) => (
                    <div key={item} className="flex items-start gap-3 border-b border-stone-200/80 pb-4 last:border-b-0 last:pb-0">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <p className="text-sm leading-7 text-stone-700">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-none border border-stone-300 bg-white/75 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Tenant path example</p>
                  <p className="mt-2 font-mono text-sm text-stone-800">ciutatis.com/ar/tandil-abc</p>
                  <p className="mt-3 text-sm leading-7 text-stone-600">
                    Ciutatis is being shaped to separate the public layer, the company shell, and each city runtime into clear operating boundaries.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="grid gap-10 border-b border-stone-300/70 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:py-24">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-700">{content.audience.eyebrow}</p>
            </div>
            <div className="space-y-8">
              <div className="space-y-5">
                <h2 className="max-w-3xl font-serif text-3xl leading-tight text-stone-950 md:text-5xl">
                  {content.audience.title}
                </h2>
                <p className="max-w-3xl text-lg leading-9 text-stone-700">{content.audience.body}</p>
              </div>

              <div className="grid gap-px overflow-hidden border border-stone-300 bg-stone-300 md:grid-cols-3">
                {content.audience.groups.map((group) => (
                  <article key={group.title} className="bg-[rgba(255,255,255,0.88)] p-7">
                    <h3 className="font-serif text-2xl leading-tight text-stone-950">{group.title}</h3>
                    <p className="mt-4 text-sm leading-8 text-stone-700">{group.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-10 border-b border-stone-300/70 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:py-24">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-700">{content.positioning.eyebrow}</p>
            </div>
            <div className="space-y-5">
              <h2 className="max-w-3xl font-serif text-3xl leading-tight text-stone-950 md:text-5xl">
                {content.positioning.title}
              </h2>
              <p className="max-w-3xl text-lg leading-9 text-stone-700">{content.positioning.body}</p>
            </div>
          </section>

          <section className="py-16 lg:py-24">
            <div className="grid gap-px overflow-hidden border border-stone-300 bg-stone-300 lg:grid-cols-3">
              {content.pillars.map((pillar) => (
                <article key={pillar.title} className="bg-[rgba(255,255,255,0.9)] p-8 sm:p-10">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{pillar.eyebrow}</p>
                  <h3 className="mt-5 font-serif text-2xl leading-tight text-stone-950">{pillar.title}</h3>
                  <p className="mt-5 text-sm leading-8 text-stone-700">{pillar.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="operating-model" className="grid gap-12 border-b border-stone-300/70 py-16 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:py-24">
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-700">{content.operatingModel.eyebrow}</p>
              <h2 className="font-serif text-3xl leading-tight text-stone-950 md:text-4xl">{content.operatingModel.title}</h2>
              <p className="text-base leading-8 text-stone-700">{content.operatingModel.body}</p>
            </div>

            <div className="space-y-6">
              {content.operatingModel.steps.map((step, index) => (
                <article key={step.title} className="grid gap-4 border-b border-stone-300/70 pb-6 last:border-b-0 last:pb-0 md:grid-cols-[120px_1fr]">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{step.label}</div>
                  <div>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-400 text-[11px] font-semibold text-stone-700">
                        {index + 1}
                      </div>
                      <h3 className="font-serif text-2xl text-stone-950">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-8 text-stone-700">{step.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-10 py-16 lg:grid-cols-[1fr_0.95fr] lg:py-24">
            <div className="space-y-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-700">{content.productTruth.eyebrow}</p>
              <h2 className="font-serif text-3xl leading-tight text-stone-950 md:text-5xl">{content.productTruth.title}</h2>
              <p className="max-w-2xl text-lg leading-9 text-stone-700">{content.productTruth.body}</p>
            </div>

            <div className="border border-stone-300 bg-white/85 p-8 shadow-[0_24px_60px_rgba(120,113,108,0.08)]">
              <div className="mb-6 flex items-center gap-3 border-b border-stone-300/70 pb-4">
                <div className="flex h-10 w-10 items-center justify-center border border-stone-300 bg-stone-50">
                  <Waypoints className="h-4 w-4 text-amber-700" />
                </div>
                <div className="font-serif text-2xl text-stone-950">Ciutatis</div>
              </div>
              <div className="space-y-5">
                {content.productTruth.points.map((point) => (
                  <div key={point} className="flex gap-3">
                    <Building2 className="mt-1 h-4 w-4 shrink-0 text-stone-400" />
                    <p className="text-sm leading-8 text-stone-700">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border border-stone-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(245,239,227,0.92)_100%)] p-8 shadow-[0_28px_70px_rgba(120,113,108,0.12)] sm:p-10 lg:p-14">
            <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
              <div className="space-y-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-amber-700">Ciutatis</p>
                <h2 className="max-w-3xl font-serif text-3xl leading-tight text-stone-950 md:text-5xl">{content.close.title}</h2>
                <p className="max-w-3xl text-lg leading-9 text-stone-700">{content.close.body}</p>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <Button asChild className="w-full rounded-none border border-stone-900 bg-stone-900 px-6 py-6 text-xs uppercase tracking-[0.22em] text-white hover:bg-stone-800 lg:w-auto">
                  <Link to="/auth">
                    {content.close.primaryCta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <a
                  className="inline-flex w-full items-center justify-center rounded-none border border-stone-400 bg-white/70 px-6 py-6 text-xs font-medium uppercase tracking-[0.22em] text-stone-700 transition-colors hover:border-stone-700 hover:text-stone-950 lg:w-auto"
                  href="https://github.com/tebayoso/ciutatis"
                  target="_blank"
                  rel="noreferrer"
                >
                  {content.close.secondaryCta}
                </a>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-stone-300/70 py-8 text-center text-[11px] uppercase tracking-[0.24em] text-stone-500">
          {content.footer}
        </footer>
      </div>
    </div>
  );
}
