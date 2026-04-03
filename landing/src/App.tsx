import { useState, useEffect } from "react";
import { ArrowRight, Building2, Globe2, ShieldCheck, Scale, FileSignature, Landmark, CheckCircle2, Lock } from "lucide-react";

const adminShellUrl = import.meta.env.VITE_ADMIN_SHELL_URL ?? "http://localhost:3100";

const dict = {
  en: {
    nav: {
      github: "GitHub",
      admin: "Open admin shell",
      langSwitch: "ES"
    },
    hero: {
      eyebrow: "Civic Control Plane",
      title: "The operating system for public institutions.",
      subtitle: "Ciutatis is a unified control plane combining governance, budget oversight, and task execution across city-scale runtimes. Built for resilience and public trust.",
      ctaPrimary: "Enter the administration shell",
      ctaSecondary: "Explore the architecture"
    },
    features: {
      eyebrow: "Architecture",
      title: "Designed for civic scale and precision.",
      subtitle: "The public marketing layer, the institutional shell, and each tenant runtime have distinct, impenetrable boundaries. This reduces friction and makes deployment easier to reason about.",
      cards: [
        {
          title: "Institutional Governance",
          eyebrow: "01 / Oversight",
          description: "Track approvals, legislative tasks, and policy deployment with full auditability and operator-level approvals."
        },
        {
          title: "Budget Allocation",
          eyebrow: "02 / Finance",
          description: "Strict financial boundary enforcement with hard-stop budget pauses and transparent flows for public funds."
        },
        {
          title: "Tenant Runtimes",
          eyebrow: "03 / Deployment",
          description: "Spin up dedicated instances for different departments or municipalities within a unified, strictly authorized architecture."
        }
      ]
    },
    principles: {
      eyebrow: "Operating Principles",
      cards: [
        {
          title: "Auditable by Default",
          body: "Every mutation is recorded. Transparency isn't an add-on; it's the core primitive of the system."
        },
        {
          title: "Single-Assignee Execution",
          body: "Clear accountability. One owner per task ensures nothing falls through bureaucratic cracks."
        },
        {
          title: "Strict Authorization",
          body: "Operator-level approvals and rigorous boundary enforcement between tenant cities and departments."
        }
      ]
    },
    guarantee: {
      title: "Operating with the precision required by public trust.",
      body: "Ciutatis treats cities as provisionable, sovereign instances—not just rows in a database. It brings predictability and structural integrity to civic coordination."
    },
    footer: {
      rights: "© 2026 Ciutatis. Open source civic infrastructure."
    }
  },
  es: {
    nav: {
      github: "GitHub",
      admin: "Abrir panel de control",
      langSwitch: "EN"
    },
    hero: {
      eyebrow: "Panel de Control Cívico",
      title: "El sistema operativo para instituciones públicas.",
      subtitle: "Ciutatis es una plataforma unificada que combina gobernanza, control presupuestario y ejecución de tareas en entornos a escala de ciudad. Construido para la resiliencia y la confianza pública.",
      ctaPrimary: "Ingresar al panel de administración",
      ctaSecondary: "Explorar la arquitectura"
    },
    features: {
      eyebrow: "Arquitectura",
      title: "Diseñado para escala y precisión cívica.",
      subtitle: "La capa pública, el panel institucional y cada entorno inquilino tienen límites claros e impenetrables. Esto reduce la fricción y facilita la comprensión de cada despliegue.",
      cards: [
        {
          title: "Gobernanza Institucional",
          eyebrow: "01 / Supervisión",
          description: "Rastrea aprobaciones, tareas legislativas y despliegue de políticas con auditabilidad total y aprobaciones a nivel de operador."
        },
        {
          title: "Asignación Presupuestaria",
          eyebrow: "02 / Finanzas",
          description: "Aplicación estricta de límites financieros con pausas presupuestarias obligatorias y flujos transparentes para fondos públicos."
        },
        {
          title: "Entornos Inquilinos",
          eyebrow: "03 / Despliegue",
          description: "Despliega instancias dedicadas para diferentes departamentos o municipios bajo una arquitectura unificada y estrictamente autorizada."
        }
      ]
    },
    principles: {
      eyebrow: "Principios Operativos",
      cards: [
        {
          title: "Auditable por Defecto",
          body: "Cada mutación queda registrada. La transparencia no es un anexo; es la base fundamental del sistema."
        },
        {
          title: "Ejecución con Asignación Única",
          body: "Responsabilidad clara. Un propietario por tarea asegura que nada se pierda en la burocracia."
        },
        {
          title: "Autorización Estricta",
          body: "Aprobaciones a nivel de operador y aplicación rigurosa de límites entre ciudades y departamentos inquilinos."
        }
      ]
    },
    guarantee: {
      title: "Operando con la precisión que exige la confianza pública.",
      body: "Ciutatis trata a las ciudades como instancias soberanas aprovisionables, no solo como filas en una base de datos. Aporta previsibilidad e integridad estructural a la coordinación cívica."
    },
    footer: {
      rights: "© 2026 Ciutatis. Infraestructura cívica de código abierto."
    }
  }
};

type Locale = "en" | "es";

export function App() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/es")) {
      setLocale("es");
      document.documentElement.lang = "es";
    } else {
      setLocale("en");
      document.documentElement.lang = "en";
      if (path !== "/en" && path !== "/") {
        window.history.replaceState(null, "", "/en");
      }
    }
  }, []);

  const toggleLocale = () => {
    const next = locale === "en" ? "es" : "en";
    window.history.pushState(null, "", `/${next}`);
    setLocale(next);
    document.documentElement.lang = next;
  };

  const t = dict[locale];

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--ink)] font-sans selection:bg-[var(--accent-soft)] selection:text-slate-900">
      {/* Top framing line */}
      <div className="h-1 w-full bg-[var(--ink)]" />
      
      {/* Background accents (subtle) */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(196,169,98,0.03),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0)_0%,#fdfcfb_100%)] pointer-events-none" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-8 lg:px-12 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 text-sm uppercase tracking-[0.2em] text-[var(--ink)] font-serif">
          <Landmark className="h-5 w-5 text-[var(--accent)]" />
          <span className="font-semibold">Ciutatis</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={toggleLocale} className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-strong)] hover:text-[var(--ink)] transition-colors">
            {t.nav.langSwitch}
          </button>
          <a className="text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--ink)] transition-colors hidden sm:block" href="https://github.com/tebayoso/ciutatis" target="_blank" rel="noreferrer">
            {t.nav.github}
          </a>
          <a className="hero-button" href={`${adminShellUrl}/auth`}>
            {t.nav.admin}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col px-6 pb-24 pt-16 lg:px-12 lg:pb-32 lg:pt-24">
        {/* HERO */}
        <section className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)] bg-white/50 backdrop-blur-md">
            <Scale className="h-3.5 w-3.5 text-[var(--accent)]" />
            {t.hero.eyebrow}
          </div>

          <h1 className="text-5xl font-normal leading-[1.05] tracking-tight text-[var(--ink)] md:text-7xl font-serif">
            {t.hero.title}
          </h1>
          
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted-strong)] md:text-xl font-serif">
            {t.hero.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a className="hero-button-solid" href={`${adminShellUrl}/auth`}>
              {t.hero.ctaPrimary}
              <ArrowRight className="h-4 w-4" />
            </a>
            <a className="ghost-button" href="#architecture">
              {t.hero.ctaSecondary}
            </a>
          </div>
        </section>

        {/* DIVIDER */}
        <div className="w-full max-w-3xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent my-24 lg:my-32" />

        {/* ARCHITECTURE / HOW IT WORKS */}
        <section id="architecture" className="space-y-16">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{t.features.eyebrow}</p>
            <h2 className="text-3xl font-normal tracking-tight text-[var(--ink)] md:text-4xl font-serif">
              {t.features.title}
            </h2>
            <p className="text-base leading-relaxed text-[var(--muted-strong)] font-serif max-w-2xl">
              {t.features.subtitle}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {t.features.cards.map((card, idx) => (
              <article key={card.title} className="service-card group">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)] mb-6">{card.eyebrow}</p>
                {idx === 0 && <FileSignature className="h-6 w-6 text-[var(--ink)] mb-4 opacity-80" />}
                {idx === 1 && <Lock className="h-6 w-6 text-[var(--ink)] mb-4 opacity-80" />}
                {idx === 2 && <Globe2 className="h-6 w-6 text-[var(--ink)] mb-4 opacity-80" />}
                <h3 className="text-xl font-medium text-[var(--ink)] font-serif">{card.title}</h3>
                <div className="h-[1px] w-12 bg-[var(--accent)] my-4 opacity-50 group-hover:w-full transition-all duration-500 ease-out" />
                <p className="text-sm leading-relaxed text-[var(--muted-strong)]">{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* PRINCIPLES */}
        <section className="mt-24 lg:mt-32 grid gap-12 lg:grid-cols-[1fr_2fr] items-start border-t border-[var(--border)] pt-16">
          <div className="sticky top-12">
            <h2 className="text-2xl font-normal tracking-tight text-[var(--ink)] font-serif">
              {t.principles.eyebrow}
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {t.principles.cards.map((principle, idx) => (
              <article key={principle.title} className="principle-card">
                <CheckCircle2 className="h-5 w-5 text-[var(--accent)] mb-4" />
                <h3 className="text-base font-medium text-[var(--ink)] font-serif">{principle.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">{principle.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* GUARANTEE / CTA */}
        <section className="mt-24 lg:mt-32 rounded-2xl bg-[var(--panel-strong)] border border-[var(--border)] p-10 lg:p-16 text-center max-w-4xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50" />
          <ShieldCheck className="h-8 w-8 text-[var(--accent)] mx-auto mb-6" />
          <h2 className="text-3xl font-normal text-[var(--ink)] font-serif mb-6">
            {t.guarantee.title}
          </h2>
          <p className="text-base text-[var(--muted-strong)] max-w-2xl mx-auto leading-relaxed font-serif mb-10">
            {t.guarantee.body}
          </p>
          <a className="hero-button-solid inline-flex" href={`${adminShellUrl}/auth`}>
            {t.hero.ctaPrimary}
          </a>
        </section>
      </main>

      <footer className="w-full border-t border-[var(--border)] py-8 text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-medium">
          {t.footer.rights}
        </p>
      </footer>
    </div>
  );
}
