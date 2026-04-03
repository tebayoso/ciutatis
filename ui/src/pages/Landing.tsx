import { useState } from "react";
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Building2, Shield, Target, GitBranch, Mail, ArrowRight } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";

type Language = "es" | "en";

const CONTENT = {
  es: {
    heroTitle: "Ciutatis",
    heroTagline: "El sistema operativo para construir plataformas cívicas",
    heroDesc: "Una arquitectura de control para instituciones modernas. Gobernanza, operaciones y automatización en un solo lugar.",
    signIn: "Iniciar Sesión",
    initiativeTitle: "La Iniciativa",
    initiativeDesc: "Ciutatis es una herramienta corporativa cerrada diseñada para orquestar canales de IA en operaciones municipales y gubernamentales. No es un simple gestor de tareas, es una institución digital completa con organigramas, presupuestos, gobernanza y alineación de objetivos.",
    featuresTitle: "Características Principales",
    features: [
      {
        title: "Estructura Organizacional",
        desc: "Organigramas reales, roles y líneas de reporte para sus agentes.",
        icon: Building2
      },
      {
        title: "Alineación de Objetivos",
        desc: "Cada tarea está trazada hacia la misión institucional. Cero trabajo sin propósito.",
        icon: Target
      },
      {
        title: "Control de Presupuestos",
        desc: "Límites mensuales por agente. Control de costos en tiempo real.",
        icon: Shield
      },
      {
        title: "Gobierno Corporativo",
        desc: "Aprobaciones estrictas y control de cambios en la estrategia.",
        icon: GitBranch
      }
    ],
    githubTitle: "Código Abierto",
    githubDesc: "Ciutatis es un fork cívico de código abierto (MIT). Transparente, auditable y listo para implementarse en sus propios servidores.",
    githubLink: "Ver en GitHub",
    contactTitle: "Contacto",
    contactDesc: "¿Desea implementar Ciutatis en su organización? Contáctenos para explorar casos de uso.",
    contactCta: "Contactar",
  },
  en: {
    heroTitle: "Ciutatis",
    heroTagline: "The operating system for building civic platforms",
    heroDesc: "A control architecture for modern institutions. Governance, operations, and automation in one place.",
    signIn: "Sign In",
    initiativeTitle: "The Initiative",
    initiativeDesc: "Ciutatis is a closed corporate tool designed to orchestrate AI channels in municipal and government operations. It is not just a task manager, it's a complete digital institution with org charts, budgets, governance, and objective alignment.",
    featuresTitle: "Core Features",
    features: [
      {
        title: "Organizational Structure",
        desc: "Real org charts, roles, and reporting lines for your agents.",
        icon: Building2
      },
      {
        title: "Objective Alignment",
        desc: "Every task traces back to the institutional mission. Zero purposeless work.",
        icon: Target
      },
      {
        title: "Budget Control",
        desc: "Monthly limits per agent. Real-time cost monitoring and enforcement.",
        icon: Shield
      },
      {
        title: "Corporate Governance",
        desc: "Strict approval gates and strategy change control.",
        icon: GitBranch
      }
    ],
    githubTitle: "Open Source",
    githubDesc: "Ciutatis is an open-source civic fork (MIT). Transparent, auditable, and ready to deploy on your own infrastructure.",
    githubLink: "View on GitHub",
    contactTitle: "Contact Us",
    contactDesc: "Looking to deploy Ciutatis in your organization? Contact us to explore use cases.",
    contactCta: "Get in Touch",
  }
};

export function Landing() {
  const [lang, setLang] = useState<Language>("es");
  const [showContactForm, setShowContactForm] = useState(false);
  const t = CONTENT[lang];

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-900 font-sans selection:bg-slate-200">
      {/* Header */}
      <header className="fixed top-0 w-full bg-[#faf9f6]/90 backdrop-blur-sm border-b border-slate-200 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-700" />
            <span className="font-serif font-bold text-lg tracking-wide text-slate-800">Ciutatis</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200">
              <button 
                onClick={() => setLang("es")}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${lang === "es" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                ES
              </button>
              <button 
                onClick={() => setLang("en")}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${lang === "en" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                EN
              </button>
            </div>
            <Button asChild variant="outline" className="font-serif bg-white border-slate-300 hover:bg-slate-50 text-slate-800">
              <Link to="/auth">{t.signIn}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="px-6 py-20 md:py-32 max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-5xl md:text-7xl font-bold text-slate-900 mb-6 tracking-tight">
            {t.heroTitle}
          </h1>
          <p className="font-serif text-xl md:text-2xl text-slate-700 mb-8 leading-relaxed max-w-2xl mx-auto">
            {t.heroTagline}
          </p>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t.heroDesc}
          </p>
          <div className="mt-12 flex items-center justify-center gap-4">
            <div className="h-[1px] w-12 bg-slate-300"></div>
            <Building2 className="w-6 h-6 text-slate-400" />
            <div className="h-[1px] w-12 bg-slate-300"></div>
          </div>
        </section>

        {/* Initiative Section */}
        <section className="px-6 py-16 bg-white border-y border-slate-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-3xl font-bold text-slate-900 mb-6 text-center">
              {t.initiativeTitle}
            </h2>
            <p className="text-lg text-slate-700 leading-relaxed text-center max-w-3xl mx-auto font-serif">
              {t.initiativeDesc}
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-24 max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl font-bold text-slate-900 mb-12 text-center">
            {t.featuresTitle}
          </h2>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {t.features.map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                  <feature.icon className="w-6 h-6 text-slate-700" />
                </div>
                <h3 className="font-serif text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* GitHub & Contact Sections */}
        <section className="px-6 py-20 bg-slate-900 text-slate-50 mt-12">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-16">
            <div>
              <h2 className="font-serif text-2xl font-bold mb-4">{t.githubTitle}</h2>
              <p className="text-slate-300 leading-relaxed mb-6">
                {t.githubDesc}
              </p>
              <a 
                href="https://github.com/tebayoso/ciutatis" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-white font-medium hover:text-slate-300 transition-colors"
              >
                <GitBranch className="w-5 h-5" />
                {t.githubLink}
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>
            <div id="contact">
              <h2 className="font-serif text-2xl font-bold mb-4">{t.contactTitle}</h2>
              <p className="text-slate-300 leading-relaxed mb-6">
                {t.contactDesc}
              </p>
              {showContactForm ? (
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <ContactForm />
                </div>
              ) : (
                <Button
                  onClick={() => setShowContactForm(true)}
                  className="bg-white text-slate-900 hover:bg-slate-200 font-serif rounded-none px-8 py-6 h-auto text-lg"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  {t.contactCta}
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 py-8 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Ciutatis. Open source under MIT.</p>
      </footer>
    </div>
  );
}
