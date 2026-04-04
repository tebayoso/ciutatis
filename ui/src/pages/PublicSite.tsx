import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Link, useLocation } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { ContactForm, type ContactFormCopy } from "@/components/ContactForm";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ChevronRight,
  FileCheck2,
  Handshake,
  Landmark,
  MapPinned,
  Network,
  ScrollText,
  ShieldCheck,
  Waypoints,
} from "lucide-react";

type Locale = "en" | "es";
type PageKey = "home" | "platform" | "about" | "partners";

type HeroContent = {
  eyebrow: string;
  title: string;
  body: string;
};

type StoryCard = {
  title: string;
  body: string;
};

type SiteContent = {
  meta: {
    defaultTitle: string;
    defaultDescription: string;
  };
  nav: {
    mark: string;
    languageLabel: string;
    github: string;
    signIn: string;
    links: Record<PageKey, string>;
  };
  common: {
    currentStatus: string;
    currentStatusBody: string;
    structuralSignals: string;
    skipToContent: string;
    openShell: string;
    readCode: string;
    pageNotFound: string;
    pageNotFoundBody: string;
    backHome: string;
    xDefaultLabel: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    body: string;
    form: ContactFormCopy;
  };
  pages: Record<
    PageKey,
    {
      title: string;
      description: string;
      hero: HeroContent;
    }
  >;
  home: {
    primaryCta: string;
    secondaryCta: string;
    heroTags: string[];
    statusCards: Array<{ label: string; value: string; note: string }>;
    commitmentEyebrow: string;
    commitmentTitle: string;
    commitmentBody: string;
    commitmentCards: StoryCard[];
    modelEyebrow: string;
    modelTitle: string;
    modelBody: string;
    modelCards: StoryCard[];
    audienceEyebrow: string;
    audienceTitle: string;
    audienceBody: string;
    audienceCards: StoryCard[];
    featuredEyebrow: string;
    featuredTitle: string;
    featuredCards: Array<{ page: PageKey; title: string; body: string }>;
    loopEyebrow: string;
    loopTitle: string;
    loopBody: string;
    loopSteps: Array<{ label: string; title: string; body: string }>;
    closeTitle: string;
    closeBody: string;
  };
  platform: {
    architectureEyebrow: string;
    architectureTitle: string;
    architectureBody: string;
    architectureCards: Array<{ title: string; body: string; icon: "public" | "shell" | "tenant" }>;
    governanceEyebrow: string;
    governanceTitle: string;
    governanceBody: string;
    governanceSteps: Array<{ label: string; title: string; body: string }>;
    boundaryEyebrow: string;
    boundaryTitle: string;
    boundaryPoints: string[];
  };
  about: {
    storyEyebrow: string;
    storyTitle: string;
    storyBody: string;
    storyCards: Array<{ title: string; body: string }>;
    principlesEyebrow: string;
    principlesTitle: string;
    principles: Array<{ title: string; body: string }>;
  };
  partners: {
    networkEyebrow: string;
    networkTitle: string;
    networkBody: string;
    partnerCards: Array<{ name: string; role: string; body: string; href?: string }>;
    impactEyebrow: string;
    impactTitle: string;
    impactCards: Array<{ value: string; label: string; note: string }>;
  };
  footer: string;
};

const HOME_HERO_IMAGE = "/public-site/tandil-hero.jpg";
const HOME_COMMITMENT_IMAGE = "/public-site/tandil-commitment.jpg";

const PAGE_SLUGS: Record<Locale, Record<PageKey, string>> = {
  en: {
    home: "",
    platform: "platform",
    about: "about",
    partners: "partners",
  },
  es: {
    home: "",
    platform: "procesos",
    about: "modulos",
    partners: "casos",
  },
};

const PAGE_SLUG_ALIASES: Partial<Record<Locale, Record<string, PageKey>>> = {
  es: {
    plataforma: "platform",
    nosotros: "about",
    alianzas: "partners",
  },
};

const SITE: Record<Locale, SiteContent> = {
  en: {
    meta: {
      defaultTitle: "Ciutatis — GovOps for citizenship, efficiency, and transparency",
      defaultDescription:
        "Ciutatis is an open-source GovOps layer for governments that need better citizen service, higher operational efficiency, transparent execution, and custom modules that fit public work.",
    },
    nav: {
      mark: "Ciutatis",
      languageLabel: "Language",
      github: "GitHub",
      signIn: "Enter admin shell",
      links: {
        home: "Home",
        platform: "Process & efficiency",
        about: "Plugins & modules",
        partners: "Success stories",
      },
    },
    common: {
      currentStatus: "Where it lands",
      currentStatusBody:
        "Built for public teams where citizen requests cross areas, context gets lost, and each step still needs traceability.",
      structuralSignals: "Structural signals",
      skipToContent: "Skip to content",
      openShell: "Open the shell",
      readCode: "Read the code",
      pageNotFound: "Public page not found",
      pageNotFoundBody: "This page is not part of the current Ciutatis public site.",
      backHome: "Back to home",
      xDefaultLabel: "EN",
    },
    contact: {
      eyebrow: "Contact support",
      title: "Create a support request directly from the public site.",
      body:
        "Send the operational question, blocker, or workflow need here. The form creates a new request for the support agent with the page and locale attached.",
      form: {
        nameLabel: "Name",
        namePlaceholder: "Alex Rivera…",
        emailLabel: "Email",
        emailPlaceholder: "alex@example.com…",
        messageLabel: "Message",
        messagePlaceholder: "Describe the process, blocker, or module you want to discuss…",
        submitIdle: "Send message",
        submitSubmitting: "Sending…",
        successTitle: "Thanks. Your request is already in the support queue.",
        successAction: "Send another message",
        errorMessage: "We couldn't submit your message. Please try again.",
        validation: {
          nameRequired: "Name is required",
          emailRequired: "Email is required",
          emailInvalid: "Please enter a valid email address",
          messageRequired: "Message is required",
        },
      },
    },
    pages: {
      home: {
        title: "Ciutatis — GovOps for governments that need clarity",
        description:
          "Open-source GovOps layer for governments, citizen-facing workflows, transparent operations, plugins, and custom public-service modules.",
        hero: {
          eyebrow: "Open GovOps layer",
          title: "Better service. Clear government.",
          body:
            "Ciutatis keeps workflows, approvals, conversation, plugins, and custom modules in one system. Better service for citizens. More efficiency. More transparency.",
        },
      },
      platform: {
        title: "Process & efficiency — Ciutatis",
        description:
          "How Ciutatis improves GovOps flow, communication, operational efficiency, and transparency through one modular operating layer.",
        hero: {
          eyebrow: "Process & efficiency",
          title: "Efficiency and transparency start in one place.",
          body:
            "Workflow logic, approvals, communication, automation, and intervention stay in one frame for public operations.",
        },
      },
      about: {
        title: "Plugins & modules — Ciutatis",
        description:
          "Extend Ciutatis with plugins, custom modules, adapters, and organization-specific workflow surfaces.",
        hero: {
          eyebrow: "Plugins & modules",
          title: "Extend the system. Keep the core.",
          body:
            "A thin core with rich edges: plugins, adapters, custom modules, and tailored operational surfaces.",
        },
      },
      partners: {
        title: "Success stories — Ciutatis",
        description:
          "Examples of institutions using the Ciutatis model to improve GovOps flow, communication, efficiency, and delivery.",
        hero: {
          eyebrow: "Success stories",
          title: "Real institutions. Clearer flow.",
          body:
            "The main site now speaks directly to government. These stories show how the same model improves flow, context, and delivery.",
        },
      },
    },
    home: {
      primaryCta: "See the model",
      secondaryCta: "See stories",
      heroTags: ["Process in plain sight", "Talk where work lives", "Extend with plugins"],
      statusCards: [
        {
          label: "Cycle time",
          value: "70% faster",
          note: "Routing, approvals, and context stay together.",
        },
        {
          label: "Follow-up loops",
          value: "0–1 extra",
          note: "Teams stop repeating the same context.",
        },
        {
          label: "Team capacity",
          value: "3–5×",
          note: "Less coordination drag. More throughput.",
        },
      ],
      commitmentEyebrow: "Commitment",
      commitmentTitle: "Built for trust that lasts.",
      commitmentBody:
        "We treat Ciutatis as public infrastructure: open code, clear governance, local stewardship, better citizen service, and measurable gains in efficiency and transparency.",
      commitmentCards: [
        {
          title: "Open by default",
          body: "The shared core stays auditable, forkable, and improveable.",
        },
        {
          title: "Local stewardship",
          body: "Each organization keeps control over data, deployment, and pace.",
        },
        {
          title: "Institutional memory",
          body: "Process, decisions, and context remain searchable and durable.",
        },
      ],
      modelEyebrow: "Sustainable model",
      modelTitle: "Open source, funded to endure.",
      modelBody:
        "The model is not license extraction. Revenue comes from implementation, support, hosting, GovOps modules, and sponsored upstream work that strengthens the public core.",
      modelCards: [
        {
          title: "Shared core",
          body: "The common layer stays open and improves in public.",
        },
        {
          title: "Upstream contributions",
          body: "Generic improvements go back to the shared system whenever possible.",
        },
        {
          title: "Stewardship retainers",
          body: "Institutions fund maintenance, roadmap work, and long-term support.",
        },
        {
          title: "Custom delivery",
          body: "Specific workflows fund modules, rollout, training, and integration work.",
        },
      ],
      audienceEyebrow: "Built for",
      audienceTitle: "For governments that cannot run on guesswork.",
      audienceBody:
        "GovOps teams, public institutions, and service units that need cleaner handoffs, visible process, better citizen response, and room for custom logic.",
      audienceCards: [
        {
          title: "GovOps leads",
          body: "Spot drag. Fix flow. Intervene early.",
        },
        {
          title: "Citizen service teams",
          body: "Keep approvals, notes, and status on the same request.",
        },
        {
          title: "Public builders",
          body: "Ship plugins and modules without rebuilding the core.",
        },
      ],
      featuredEyebrow: "Start here",
      featuredTitle: "Three ways in.",
      featuredCards: [
        {
          page: "platform",
          title: "Process & efficiency",
          body: "See how flow gets cleaner and faster.",
        },
        {
          page: "about",
          title: "Plugins & modules",
          body: "See how the system bends without breaking.",
        },
        {
          page: "partners",
          title: "Success stories",
          body: "See the model in real operating environments.",
        },
      ],
      loopEyebrow: "How it works",
      loopTitle: "One loop. No fragmentation.",
      loopBody:
        "Map the public process. Keep citizen context attached. Extend the system when government work demands it.",
      loopSteps: [
        {
          label: "01",
          title: "Map the flow",
          body: "Make stages, ownership, and approvals explicit.",
        },
        {
          label: "02",
          title: "Keep context attached",
          body: "Comments, updates, and decisions stay on the same object.",
        },
        {
          label: "03",
          title: "Extend without rework",
          body: "Add plugins, surfaces, and organization-specific logic without tearing up the core.",
        },
      ],
      closeTitle: "Build clearer operations.",
      closeBody:
        "Open core. Public control. Better service.",
    },
    platform: {
      architectureEyebrow: "Core model",
      architectureTitle: "A core shell, an extension layer, and workflow-specific modules.",
      architectureBody:
        "Ciutatis stays flexible by separating the stable GovOps core from the logic each institution needs to add.",
      architectureCards: [
        {
          icon: "public",
          title: "Core shell",
          body: "The shared operating surface for process state, approvals, assignments, communication, intervention, and traceable public service delivery.",
        },
        {
          icon: "shell",
          title: "Plugin system",
          body: "Adds integrations, automation, UI surfaces, and capabilities without forcing every organization into the same stack.",
        },
        {
          icon: "tenant",
          title: "Custom modules",
          body: "Supports workflow-specific logic, forms, panels, and domain operations tailored to the way a team actually works.",
        },
      ],
      governanceEyebrow: "Process gains",
      governanceTitle: "Efficiency and transparency come from structure, not noise.",
      governanceBody:
        "Ciutatis improves GovOps by keeping the moving parts in one place and making each step legible.",
      governanceSteps: [
        {
          label: "A",
          title: "Process stages are explicit",
          body: "Workflows are visible, owned, and easier to improve because the sequence is no longer hidden in spreadsheets and side conversations.",
        },
        {
          label: "B",
          title: "Communication stays in context",
          body: "Requests, comments, decisions, and changes stay attached to the work instead of splintering across channels.",
        },
        {
          label: "C",
          title: "Plugins remove repeated manual work",
          body: "Automations, integrations, and custom surfaces reduce repetitive coordination and keep teams moving.",
        },
        {
          label: "D",
          title: "Leadership can measure and intervene",
          body: "Bottlenecks, idle stages, and costly loops are easier to spot before they become public-service drag.",
        },
      ],
      boundaryEyebrow: "What it avoids",
      boundaryTitle: "Ciutatis is designed to prevent fragmentation.",
      boundaryPoints: [
        "It is not another ticket list with detached chat; communication stays connected to the work.",
        "It is not a rigid suite; plugins and custom modules let the system fit the process.",
        "It is not automation without control; teams can inspect, intervene, and adapt as the workflow evolves.",
      ],
    },
    about: {
      storyEyebrow: "Extension system",
      storyTitle: "Plugins and custom modules are part of the product, not an afterthought.",
      storyBody:
        "Ciutatis is built as an extensible GovOps layer. The core stays stable while each institution adds the modules, integrations, and workflow surfaces its public processes require.",
      storyCards: [
        {
          title: "Plugins",
          body: "Connect external tools, add automations, and extend the UI or action layer without modifying the core.",
        },
        {
          title: "Custom modules",
          body: "Model organization-specific flows, panels, forms, and domain logic on top of the shared operating system.",
        },
        {
          title: "Adapters and surfaces",
          body: "Bring in new runtimes, providers, and task environments while preserving one operating model for the team.",
        },
      ],
      principlesEyebrow: "Extension principles",
      principlesTitle: "A thin core with rich edges scales better than a bloated suite.",
      principles: [
        {
          title: "Keep the core stable",
          body: "Core process state, communication, and control surfaces remain consistent across organizations.",
        },
        {
          title: "Let teams fit the system to the work",
          body: "Plugins and modules adapt the platform to domain-specific flows instead of forcing work into generic shapes.",
        },
        {
          title: "Ship custom capability faster",
          body: "New logic can land as a module or plugin without slowing down the whole product.",
        },
      ],
    },
    partners: {
      networkEyebrow: "Success stories",
      networkTitle: "Named organizations live here, not in the core story.",
      networkBody:
        "Ciutatis now speaks directly to government and public operations on the main site. These stories show how specific institutions have used the model to improve process flow, communication, efficiency, and transparency.",
      partnerCards: [
        {
          name: "The Hipster Cloud S.A.",
          role: "Internal operations and product systems",
          body: "Used the Ciutatis model to coordinate product delivery, operational follow-through, and bespoke workflow logic without splitting communication from execution.",
        },
        {
          name: "UNICEN",
          role: "Institutional validation environment",
          body: "Applied the model to administrative and validation workflows where process clarity, shared context, and review discipline matter.",
          href: "https://unicen.edu.ar",
        },
        {
          name: "Cluster Tecnológico de Tandil",
          role: "Ecosystem and rollout partner",
          body: "Helped frame how the model can scale through repeatable modules, shared practices, and better operational communication across organizations.",
          href: "https://clustertecnologicotandil.org.ar",
        },
      ],
      impactEyebrow: "Shared claims",
      impactTitle: "The same operating model keeps pointing to the same gains.",
      impactCards: [
        {
          value: "70% faster",
          label: "Process cycle improvement",
          note: "Current case materials keep pointing to materially faster operating flow when routing, approvals, and discussion live in one place.",
        },
        {
          value: "3–4 → 0–1 visits",
          label: "Extra follow-up loops",
          note: "Clearer communication and shared context reduce repeated follow-up, clarification, and back-and-forth.",
        },
        {
          value: "3–5× capacity",
          label: "Operational throughput",
          note: "Teams can handle more requests and custom workflow logic without adding the same level of coordination overhead.",
        },
      ],
    },
    footer: "Open-source GovOps infrastructure for better citizen service, higher efficiency, and clearer transparency.",
  },
  es: {
    meta: {
      defaultTitle: "Ciutatis — GovOps para ciudadanía, eficiencia y transparencia",
      defaultDescription:
        "Ciutatis es una capa GovOps de código abierto para gobiernos que necesitan mejor atención a la ciudadanía, más eficiencia operativa, ejecución transparente y módulos personalizados para trabajo público.",
    },
    nav: {
      mark: "Ciutatis",
      languageLabel: "Idioma",
      github: "GitHub",
      signIn: "Entrar al shell",
      links: {
        home: "Inicio",
        platform: "Procesos y eficiencia",
        about: "Plugins y módulos",
        partners: "Casos de éxito",
      },
    },
    common: {
      currentStatus: "Dónde rinde",
      currentStatusBody:
        "Ideal para equipos públicos donde los pedidos ciudadanos cruzan áreas, el contexto se pierde y cada paso necesita trazabilidad.",
      structuralSignals: "Señales estructurales",
      skipToContent: "Saltar al contenido",
      openShell: "Abrir el shell",
      readCode: "Leer el código",
      pageNotFound: "Página pública no encontrada",
      pageNotFoundBody: "Esta página no forma parte del sitio público actual de Ciutatis.",
      backHome: "Volver al inicio",
      xDefaultLabel: "EN",
    },
    contact: {
      eyebrow: "Contactar soporte",
      title: "Creá un pedido de soporte directo desde el sitio público.",
      body:
        "Mandá por acá la consulta operativa, el bloqueo o la necesidad de workflow. El formulario crea un nuevo pedido para el agente de soporte con la página y el idioma adjuntos.",
      form: {
        nameLabel: "Nombre",
        namePlaceholder: "Ana Gómez…",
        emailLabel: "Email",
        emailPlaceholder: "ana@ejemplo.com…",
        messageLabel: "Mensaje",
        messagePlaceholder: "Describí el proceso, bloqueo o módulo que querés conversar…",
        submitIdle: "Enviar mensaje",
        submitSubmitting: "Enviando…",
        successTitle: "Gracias. Tu pedido ya entró en la cola de soporte.",
        successAction: "Enviar otro mensaje",
        errorMessage: "No pudimos enviar tu mensaje. Probá de nuevo.",
        validation: {
          nameRequired: "El nombre es obligatorio",
          emailRequired: "El email es obligatorio",
          emailInvalid: "Ingresá un email válido",
          messageRequired: "El mensaje es obligatorio",
        },
      },
    },
    pages: {
      home: {
        title: "Ciutatis — GovOps para gobiernos que necesitan claridad",
        description:
          "Capa GovOps de código abierto para gobiernos, flujos orientados a ciudadanía, operaciones transparentes, plugins y módulos públicos a medida.",
        hero: {
          eyebrow: "Capa GovOps abierta",
          title: "Mejor servicio. Gobierno claro.",
          body:
            "Ciutatis junta workflows, aprobaciones, conversación, plugins y módulos propios en un mismo sistema. Mejor atención a la ciudadanía. Más eficiencia. Más transparencia.",
        },
      },
      platform: {
        title: "Procesos y eficiencia — Ciutatis",
        description:
          "Cómo Ciutatis mejora flujo GovOps, comunicación, eficiencia operativa y transparencia desde una misma capa operativa modular.",
        hero: {
          eyebrow: "Procesos y eficiencia",
          title: "La eficiencia y la transparencia empiezan en un mismo lugar.",
          body:
            "Workflow, aprobaciones, comunicación, automatización e intervención quedan dentro del mismo marco para operaciones públicas.",
        },
      },
      about: {
        title: "Plugins y módulos — Ciutatis",
        description:
          "Extendé Ciutatis con plugins, módulos personalizados, adaptadores y superficies operativas diseñadas para cada organización.",
        hero: {
          eyebrow: "Plugins y módulos",
          title: "Extendé el sistema. Conservá el núcleo.",
          body:
            "Un núcleo fino con bordes ricos: plugins, adaptadores, módulos personalizados y superficies operativas a medida.",
        },
      },
      partners: {
        title: "Casos de éxito — Ciutatis",
        description:
          "Ejemplos de instituciones que usan el modelo Ciutatis para mejorar procesos, comunicación, eficiencia y capacidad operativa.",
        hero: {
          eyebrow: "Casos de éxito",
          title: "Instituciones reales. Flujo más claro.",
          body:
            "La historia principal ahora habla de gobierno de forma directa. Estos casos muestran cómo el mismo modelo mejora flujo, contexto y entrega.",
        },
      },
    },
    home: {
      primaryCta: "Ver modelo",
      secondaryCta: "Ver casos",
      heroTags: [
        "Proceso a la vista",
        "La charla sigue al trabajo",
        "Plugins que encajan",
      ],
      statusCards: [
        {
          label: "Ciclo",
          value: "70% más rápido",
          note: "Ruteo, aprobaciones y contexto quedan juntos.",
        },
        {
          label: "Seguimientos",
          value: "0–1 extra",
          note: "Se deja de repetir el mismo contexto.",
        },
        {
          label: "Capacidad",
          value: "3–5×",
          note: "Menos fricción. Más throughput.",
        },
      ],
      commitmentEyebrow: "Compromiso",
      commitmentTitle: "Infraestructura para durar.",
      commitmentBody:
        "Tratamos a Ciutatis como infraestructura pública: código abierto, gobernanza clara, custodia local, mejor atención a la ciudadanía y mejoras medibles en eficiencia y transparencia.",
      commitmentCards: [
        {
          title: "Abierto por defecto",
          body: "El núcleo compartido es auditable, forkable y mejorable.",
        },
        {
          title: "Custodia local",
          body: "Cada organización mantiene control sobre datos, despliegue y ritmo.",
        },
        {
          title: "Memoria institucional",
          body: "Procesos, decisiones y contexto quedan trazables y durables.",
        },
      ],
      modelEyebrow: "Modelo sustentable",
      modelTitle: "Open source con financiamiento real.",
      modelBody:
        "El proyecto no depende de cerrar el código. Se sostiene con implementación, soporte, hosting, módulos GovOps a medida y trabajo patrocinado que vuelve upstream cuando aplica.",
      modelCards: [
        {
          title: "Núcleo compartido",
          body: "La base común sigue abierta y mejora en público.",
        },
        {
          title: "Contribuciones upstream",
          body: "Lo que generaliza vuelve al sistema compartido siempre que se puede.",
        },
        {
          title: "Retainers de custodia",
          body: "Las instituciones financian mantenimiento, roadmap y soporte continuo.",
        },
        {
          title: "Entrega a medida",
          body: "Workflows específicos financian módulos, rollout, formación e integraciones.",
        },
      ],
      audienceEyebrow: "Hecho para",
      audienceTitle: "Para gobiernos que no pueden operar a ojo.",
      audienceBody:
        "Equipos GovOps, instituciones públicas y áreas de atención que necesitan handoffs limpios, proceso visible, mejor respuesta a la ciudadanía y espacio para lógica propia.",
      audienceCards: [
        {
          title: "Liderazgo GovOps",
          body: "Detecta fricción, mide desvíos e interviene antes.",
        },
        {
          title: "Equipos de atención",
          body: "Mantienen aprobaciones, notas y estado sobre el mismo pedido.",
        },
        {
          title: "Equipos públicos builders",
          body: "Suman plugins y módulos sin rehacer el núcleo.",
        },
      ],
      featuredEyebrow: "Entradas",
      featuredTitle: "Tres puertas de entrada.",
      featuredCards: [
        {
          page: "platform",
          title: "Procesos y eficiencia",
          body: "Cómo se limpia y acelera el flujo.",
        },
        {
          page: "about",
          title: "Plugins y módulos",
          body: "Cómo el sistema se adapta sin romperse.",
        },
        {
          page: "partners",
          title: "Casos de éxito",
          body: "Cómo funciona el modelo en contextos reales.",
        },
      ],
      loopEyebrow: "Cómo funciona",
      loopTitle: "Un loop. Cero fragmentación.",
      loopBody:
        "Se mapea el proceso público, se conserva el contexto ciudadano y se extiende el sistema cuando el trabajo de gobierno lo pide.",
      loopSteps: [
        {
          label: "01",
          title: "Mapear el flujo",
          body: "Se hacen explícitas las etapas, la propiedad y las aprobaciones.",
        },
        {
          label: "02",
          title: "Pegar el contexto",
          body: "Comentarios, cambios y decisiones quedan sobre el mismo objeto.",
        },
        {
          label: "03",
          title: "Extender sin rehacer",
          body: "Se suman plugins, superficies y lógica específica sin romper el sistema base.",
        },
      ],
      closeTitle: "Operaciones más claras.",
      closeBody:
        "Núcleo abierto. Control público. Mejor servicio.",
    },
    platform: {
      architectureEyebrow: "Modelo base",
      architectureTitle: "Un núcleo estable, una capa de extensiones y módulos específicos de workflow.",
      architectureBody:
        "Ciutatis se mantiene flexible separando el núcleo GovOps estable de la lógica que cada institución necesita sumar.",
      architectureCards: [
        {
          icon: "public",
          title: "Núcleo operativo",
          body: "La superficie compartida donde viven estado de proceso, aprobaciones, asignaciones, comunicación, intervención y trazabilidad del servicio público.",
        },
        {
          icon: "shell",
          title: "Sistema de plugins",
          body: "Agrega integraciones, automatizaciones, superficies de UI y nuevas capacidades sin forzar a todas las organizaciones a usar la misma pila.",
        },
        {
          icon: "tenant",
          title: "Módulos personalizados",
          body: "Permite modelar lógica específica, formularios, paneles y operaciones de dominio ajustadas a la forma real de trabajo.",
        },
      ],
      governanceEyebrow: "Ganancias de proceso",
      governanceTitle: "La eficiencia y la transparencia salen de la estructura, no del ruido.",
      governanceBody:
        "Ciutatis mejora el GovOps manteniendo las piezas móviles en un solo lugar y haciendo cada etapa legible.",
      governanceSteps: [
        {
          label: "A",
          title: "Las etapas del proceso son explícitas",
          body: "Los workflows quedan visibles, con responsables claros y más fáciles de mejorar porque la secuencia ya no se esconde en planillas y conversaciones sueltas.",
        },
        {
          label: "B",
          title: "La comunicación queda en contexto",
          body: "Pedidos, comentarios, decisiones y cambios permanecen pegados al trabajo en vez de fragmentarse entre canales.",
        },
        {
          label: "C",
          title: "Los plugins eliminan trabajo manual repetido",
          body: "Automatizaciones, integraciones y superficies personalizadas reducen coordinación repetitiva y mantienen el ritmo del equipo.",
        },
        {
          label: "D",
          title: "La dirección puede medir e intervenir",
          body: "Cuellos de botella, etapas inactivas y bucles costosos se detectan antes de convertirse en fricción para el servicio público.",
        },
      ],
      boundaryEyebrow: "Lo que evita",
      boundaryTitle: "Ciutatis está diseñado para prevenir fragmentación.",
      boundaryPoints: [
        "No es otra lista de tickets con chat separado; la comunicación sigue conectada al trabajo.",
        "No es una suite rígida; plugins y módulos personalizados permiten que el sistema se adapte al proceso.",
        "No es automatización ciega; los equipos pueden inspeccionar, intervenir y ajustar el workflow a medida que evoluciona.",
      ],
    },
    about: {
      storyEyebrow: "Sistema de extensión",
      storyTitle: "Los plugins y los módulos personalizados forman parte del producto, no un parche posterior.",
      storyBody:
        "Ciutatis está construido como una capa GovOps extensible. El núcleo se mantiene estable mientras cada institución suma los módulos, integraciones y superficies que sus procesos públicos realmente requieren.",
      storyCards: [
        {
          title: "Plugins",
          body: "Conectan herramientas externas, agregan automatizaciones y extienden la UI o la capa de acciones sin modificar el núcleo.",
        },
        {
          title: "Módulos personalizados",
          body: "Modelan flujos, paneles, formularios y lógica de dominio específicos sobre el sistema operativo compartido.",
        },
        {
          title: "Adaptadores y superficies",
          body: "Incorporan nuevos runtimes, proveedores y entornos de tarea preservando un mismo modelo operativo para todo el equipo.",
        },
      ],
      principlesEyebrow: "Principios de extensión",
      principlesTitle: "Un núcleo fino con bordes ricos escala mejor que una suite inflada.",
      principles: [
        {
          title: "Mantener estable el núcleo",
          body: "El estado de proceso, la comunicación y las superficies de control siguen siendo consistentes entre organizaciones.",
        },
        {
          title: "Dejar que el sistema se ajuste al trabajo",
          body: "Plugins y módulos adaptan la plataforma a flujos de dominio específicos en lugar de forzar el trabajo a formas genéricas.",
        },
        {
          title: "Entregar capacidad propia más rápido",
          body: "La lógica nueva puede salir como módulo o plugin sin frenar al producto completo.",
        },
      ],
    },
    partners: {
      networkEyebrow: "Casos de éxito",
      networkTitle: "Los nombres propios viven acá, no en la historia central del producto.",
      networkBody:
        "Ciutatis ahora habla de gobierno y operaciones públicas en la página principal. Estos casos muestran cómo instituciones concretas usaron el mismo modelo para mejorar flujo de procesos, comunicación, eficiencia y transparencia.",
      partnerCards: [
        {
          name: "The Hipster Cloud S.A.",
          role: "Operaciones internas y sistemas de producto",
          body: "Usó el modelo Ciutatis para coordinar entrega de producto, seguimiento operativo y lógica de workflow a medida sin separar comunicación de ejecución.",
        },
        {
          name: "UNICEN",
          role: "Entorno de validación institucional",
          body: "Aplicó el modelo a flujos administrativos y de validación donde importan la claridad del proceso, el contexto compartido y la disciplina de revisión.",
          href: "https://unicen.edu.ar",
        },
        {
          name: "Cluster Tecnológico de Tandil",
          role: "Socio de ecosistema y despliegue",
          body: "Ayudó a enmarcar cómo el modelo puede escalar mediante módulos repetibles, prácticas compartidas y mejor comunicación operativa entre organizaciones.",
          href: "https://clustertecnologicotandil.org.ar",
        },
      ],
      impactEyebrow: "Claims compartidos",
      impactTitle: "El mismo modelo operativo sigue apuntando a las mismas ganancias.",
      impactCards: [
        {
          value: "70% más rápido",
          label: "Mejora del ciclo de proceso",
          note: "Los materiales de caso siguen apuntando a un flujo sensiblemente más rápido cuando ruteo, aprobaciones y conversación viven en un mismo lugar.",
        },
        {
          value: "3–4 → 0–1 visitas",
          label: "Bucles extra de seguimiento",
          note: "Una comunicación más clara y un contexto compartido reducen seguimientos repetidos, aclaraciones y vueltas innecesarias.",
        },
        {
          value: "3–5× capacidad",
          label: "Capacidad operativa",
          note: "Los equipos pueden manejar más pedidos y más lógica operativa personalizada sin sumar el mismo nivel de sobrecarga de coordinación.",
        },
      ],
    },
    footer: "Infraestructura GovOps de código abierto para mejor atención a la ciudadanía, más eficiencia y más transparencia.",
  },
};

function resolveLocale(pathname: string): Locale {
  return pathname === "/es" || pathname.startsWith("/es/") ? "es" : "en";
}

function resolvePageKey(pathname: string, locale: Locale): PageKey | null {
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[1] ?? "";
  const matches = Object.entries(PAGE_SLUGS[locale]).find(([, value]) => value === slug);
  const aliasMatches = PAGE_SLUG_ALIASES[locale]?.[slug];
  return (matches?.[0] as PageKey | undefined) ?? aliasMatches ?? (slug === "" ? "home" : null);
}

function pathFor(locale: Locale, page: PageKey): string {
  const slug = PAGE_SLUGS[locale][page];
  return slug ? `/${locale}/${slug}` : `/${locale}`;
}

function upsertMetaByName(name: string, content: string) {
  let element = document.head.querySelector(`meta[name="${name}"]`);
  if (!(element instanceof HTMLMetaElement)) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertMetaByProperty(property: string, content: string) {
  let element = document.head.querySelector(`meta[property="${property}"]`);
  if (!(element instanceof HTMLMetaElement)) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
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

function iconForArchitecture(icon: "public" | "shell" | "tenant") {
  switch (icon) {
    case "public":
      return Landmark;
    case "shell":
      return ShieldCheck;
    case "tenant":
      return Network;
  }
}

const HOME_AUDIENCE_ICONS = [Landmark, FileCheck2, Network] as const;
const HOME_SIGNAL_ICONS = [Building2, ScrollText, MapPinned] as const;

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
      {children}
    </p>
  );
}

function SectionShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("border-b border-border/70 py-14 sm:py-16 lg:py-20", className)}>
      {children}
    </section>
  );
}

function ContentShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">{children}</div>;
}

function PublicCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "public-panel public-shadow rounded-[20px] p-6 sm:p-7",
        className,
      )}
    >
      {children}
    </div>
  );
}

function PublicHeader({ locale, currentPage, site }: { locale: Locale; currentPage: PageKey; site: SiteContent }) {
  const alternateLocale: Locale = locale === "en" ? "es" : "en";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <ContentShell>
        <div className="py-4">
          <div className="public-panel public-shadow rounded-[24px] px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                className="group flex items-center gap-3 text-foreground focus-visible:rounded-[14px]"
                to={pathFor(locale, "home")}
              >
                <div className="flex size-11 items-center justify-center rounded-[14px] border border-border bg-secondary text-primary transition-colors group-hover:border-primary/70 group-hover:text-primary">
                  <Landmark className="size-4" />
                </div>
                <div>
                  <div className="text-base font-semibold tracking-tight">{site.nav.mark}</div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    {site.pages.home.hero.eyebrow}
                  </div>
                </div>
              </Link>

              <nav className="hidden items-center gap-1 rounded-[16px] border border-border bg-secondary p-1 lg:flex">
                {(Object.keys(site.nav.links) as PageKey[]).map((page) => (
                  <Link
                    key={page}
                    to={pathFor(locale, page)}
                    className={cn(
                      "rounded-[10px] px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                      currentPage === page
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-background hover:text-foreground",
                    )}
                  >
                    {site.nav.links[page]}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden items-center gap-2 rounded-[14px] border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                  <span>{site.nav.languageLabel}</span>
                  <Link
                    className="font-semibold text-foreground hover:text-primary focus-visible:rounded-[10px]"
                    to={pathFor(alternateLocale, currentPage)}
                  >
                    {locale === "en" ? "ES" : site.common.xDefaultLabel}
                  </Link>
                </div>
                <a
                  className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-[10px] sm:inline-flex"
                  href="https://github.com/tebayoso/ciutatis"
                  target="_blank"
                  rel="noreferrer"
                >
                  {site.nav.github}
                </a>
                <Button asChild className="rounded-[10px] px-5 shadow-none">
                  <Link to="/auth">{site.nav.signIn}</Link>
                </Button>
              </div>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {(Object.keys(site.nav.links) as PageKey[]).map((page) => (
                <Link
                  key={page}
                  to={pathFor(locale, page)}
                  className={cn(
                    "whitespace-nowrap rounded-[10px] border px-3 py-2 text-sm font-medium transition-colors",
                    currentPage === page
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary text-muted-foreground hover:bg-background hover:text-foreground",
                  )}
                >
                  {site.nav.links[page]}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </ContentShell>
    </header>
  );
}

function EditorialImage({
  src,
  alt,
  className,
  imageClassName,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("public-panel public-shadow overflow-hidden rounded-[28px]", className)}>
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full object-cover", imageClassName)}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </div>
  );
}

function HeroBlock({ page, locale, site }: { page: SiteContent["pages"][PageKey]; locale: Locale; site: SiteContent }) {
  const isSpanish = locale === "es";

  return (
    <SectionShell className="pt-8 sm:pt-10 lg:pt-14">
      <ContentShell>
        <div className="space-y-6 sm:space-y-8">
          <EditorialImage
            src={HOME_HERO_IMAGE}
            alt={
              isSpanish
                ? "Ilustración panorámica de sierras de Tandil con arquitectura cívica clásica."
                : "Panoramic illustration of Tandil-inspired hills with civic classical architecture."
            }
            priority
            className="rounded-[30px]"
            imageClassName="aspect-[21/9] w-full"
          />

          <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <Waypoints className="size-3.5 text-primary" />
                {page.hero.eyebrow}
              </div>
              <p className="mt-6 max-w-2xl text-sm uppercase tracking-[0.22em] text-muted-foreground">
                {site.common.currentStatus}
              </p>
              <h1 className="public-display mt-3 max-w-5xl text-5xl leading-[0.92] text-foreground sm:text-6xl lg:text-[5.35rem]">
                {page.hero.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-[1.14rem] sm:leading-8">
                {page.hero.body}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-[10px] px-6">
                  <Link to={pathFor(locale, "platform")}>
                    {site.home.primaryCta}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-[10px] border-border bg-card px-6">
                  <Link to={pathFor(locale, "partners")}>{site.home.secondaryCta}</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {site.home.heroTags.map((tag) => (
                  <div
                    key={tag}
                    className="rounded-[10px] border border-border bg-background px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-foreground/80"
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="public-panel-soft rounded-[20px] p-6 sm:p-7">
                <SectionEyebrow>{site.common.currentStatus}</SectionEyebrow>
                <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">{site.common.currentStatusBody}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {site.home.statusCards.map((card) => (
                  <div key={card.label} className="public-panel-dark public-shadow rounded-[18px] p-5">
                    <p className="public-dark-muted text-[11px] font-semibold uppercase tracking-[0.22em]">
                      {card.label}
                    </p>
                    <p className="public-stat mt-3 text-3xl font-semibold tracking-tight">{card.value}</p>
                    <p className="public-dark-muted mt-3 text-sm leading-7">{card.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ContentShell>
    </SectionShell>
  );
}

function CommitmentSection({ locale, site }: { locale: Locale; site: SiteContent }) {
  const isSpanish = locale === "es";

  return (
    <SectionShell>
      <ContentShell>
        <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="public-panel public-shadow public-ornament rounded-[26px] p-6 sm:p-8 lg:p-9">
            <SectionEyebrow>{site.home.commitmentEyebrow}</SectionEyebrow>
            <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">
              {site.home.commitmentTitle}
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{site.home.commitmentBody}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {site.home.commitmentCards.map((card, index) => {
                const Icon = HOME_SIGNAL_ICONS[index] ?? Waypoints;

                return (
                  <div key={card.title} className="public-panel-soft flex gap-4 rounded-[18px] p-5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-border bg-background text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">{card.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{card.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <EditorialImage
            src={HOME_COMMITMENT_IMAGE}
            alt={
              isSpanish
                ? "Pabellón cívico iluminado entre las sierras de Tandil al atardecer."
                : "Illuminated civic pavilion among Tandil-inspired hills at dusk."
            }
            className="rounded-[26px]"
            imageClassName="aspect-[16/10] w-full"
          />
        </div>
      </ContentShell>
    </SectionShell>
  );
}

function BusinessModelSection({ site }: { site: SiteContent }) {
  return (
    <SectionShell className="bg-secondary">
      <ContentShell>
        <div className="grid gap-8 xl:grid-cols-[0.88fr_1.12fr]">
          <div>
            <SectionEyebrow>{site.home.modelEyebrow}</SectionEyebrow>
            <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">
              {site.home.modelTitle}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{site.home.modelBody}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {site.home.modelCards.map((card, index) => (
              <PublicCard key={card.title} className="relative overflow-hidden">
                <div className="pointer-events-none absolute right-4 top-4 text-[2.5rem] font-semibold text-border/70">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="max-w-[16rem] text-xl font-semibold tracking-tight text-foreground">{card.title}</h3>
                <p className="mt-3 max-w-[22rem] text-sm leading-7 text-muted-foreground">{card.body}</p>
              </PublicCard>
            ))}
          </div>
        </div>
      </ContentShell>
    </SectionShell>
  );
}

function HomePage({ locale, site, sourcePath }: { locale: Locale; site: SiteContent; sourcePath: string }) {
  return (
    <>
      <HeroBlock page={site.pages.home} locale={locale} site={site} />

      <SectionShell className="bg-secondary">
        <ContentShell>
          <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
            <div>
              <SectionEyebrow>{site.home.audienceEyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">
                {site.home.audienceTitle}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{site.home.audienceBody}</p>
              <div className="mt-8 space-y-3">
                {site.platform.boundaryPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <BadgeCheck className="mt-1 size-4 shrink-0 text-primary" />
                    <p className="text-sm leading-7 text-muted-foreground">{point}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              {site.home.audienceCards.map((card, index) => {
                const Icon = HOME_AUDIENCE_ICONS[index] ?? Waypoints;
                return (
                  <PublicCard key={card.title} className="h-full">
                    <div className="flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-background text-primary">
                      <Icon className="size-4" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
                  </PublicCard>
                );
              })}
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell>
        <ContentShell>
          <div className="grid gap-8 xl:grid-cols-[0.86fr_1.14fr]">
            <div>
              <SectionEyebrow>{site.platform.architectureEyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">
                {site.platform.architectureTitle}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                {site.platform.architectureBody}
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {site.platform.architectureCards.map((card, index) => {
                const Icon = iconForArchitecture(card.icon);
                const label = String(index + 1).padStart(2, "0");
                return (
                  <PublicCard key={card.title} className="relative overflow-hidden">
                    <div className="pointer-events-none absolute right-4 top-4 text-[2.5rem] font-semibold text-border/70">
                      {label}
                    </div>
                    <div className="flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-background text-primary">
                      <Icon className="size-4" />
                    </div>
                    <h3 className="mt-8 text-xl font-semibold tracking-tight text-foreground">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
                  </PublicCard>
                );
              })}
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell className="bg-[var(--public-dark)] text-[var(--public-dark-foreground)]">
        <ContentShell>
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <SectionEyebrow>{site.home.loopEyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-4xl text-4xl leading-[0.98] sm:text-5xl">
                {site.home.loopTitle}
              </h2>
              <p className="public-dark-muted mt-5 max-w-3xl text-lg leading-8">{site.home.loopBody}</p>
              <div className="mt-8 space-y-4">
                {site.home.loopSteps.map((step) => (
                  <article key={step.label} className="public-panel-dark-soft rounded-[18px] p-6">
                    <div className="flex items-center gap-3">
                      <div className="public-dark-icon rounded-[10px] px-3 py-1 text-xs font-semibold tracking-[0.24em]">
                        {step.label}
                      </div>
                      <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
                    </div>
                    <p className="public-dark-muted mt-4 text-sm leading-7">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="public-panel-dark-soft rounded-[18px] p-6 sm:p-7">
                <SectionEyebrow>{site.about.principlesEyebrow}</SectionEyebrow>
                <h3 className="public-display mt-4 text-3xl leading-tight">
                  {site.about.principlesTitle}
                </h3>
              </div>
              {site.about.principles.map((principle) => (
                <article key={principle.title} className="public-panel-dark-soft rounded-[18px] p-6">
                  <h3 className="text-lg font-semibold tracking-tight">{principle.title}</h3>
                  <p className="public-dark-muted mt-3 text-sm leading-7">{principle.body}</p>
                </article>
              ))}
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <CommitmentSection locale={locale} site={site} />

      <BusinessModelSection site={site} />

      <SectionShell className="border-b-0">
        <ContentShell>
          <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
            <PublicCard className="public-ornament relative overflow-hidden">
              <div className="relative">
                <SectionEyebrow>{site.partners.impactEyebrow}</SectionEyebrow>
                <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">
                  {site.partners.impactTitle}
                </h2>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                  {site.partners.networkBody}
                </p>
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {site.partners.impactCards.map((card) => (
                    <div key={card.label} className="public-panel-soft rounded-[16px] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        {card.label}
                      </p>
                      <p className="public-stat mt-3 text-3xl font-semibold tracking-tight text-foreground">{card.value}</p>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </PublicCard>

            <div className="grid gap-4">
              <div className="px-1">
                <SectionEyebrow>{site.home.featuredEyebrow}</SectionEyebrow>
                <h2 className="public-display mt-4 max-w-2xl text-4xl leading-[0.98] text-foreground">
                  {site.home.featuredTitle}
                </h2>
              </div>
              {site.home.featuredCards.map((card) => (
                <Link
                  key={card.page}
                  to={pathFor(locale, card.page)}
                  className="group public-panel public-shadow rounded-[20px] p-6 transition-colors hover:border-primary/60 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {site.nav.links[card.page]}
                  </p>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    <span>{site.nav.links[card.page]}</span>
                    <ChevronRight className="size-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <ClosingSection
        locale={locale}
        site={site}
        sourcePath={sourcePath}
        title={site.home.closeTitle}
        body={site.home.closeBody}
      />
    </>
  );
}

function PlatformPage({ site }: { site: SiteContent }) {
  return (
    <>
      <SectionShell>
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <SectionEyebrow>{site.platform.architectureEyebrow}</SectionEyebrow>
            </div>
            <div className="lg:col-span-8">
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {site.platform.architectureTitle}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{site.platform.architectureBody}</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {site.platform.architectureCards.map((card) => {
                  const Icon = iconForArchitecture(card.icon);
                  return (
                    <article key={card.title} className="public-panel rounded-[18px] p-6 shadow-sm">
                      <div className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-primary">
                        <Icon className="size-4" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{card.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell>
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <SectionEyebrow>{site.platform.governanceEyebrow}</SectionEyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {site.platform.governanceTitle}
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">{site.platform.governanceBody}</p>
            </div>
            <div className="space-y-4 lg:col-span-8">
              {site.platform.governanceSteps.map((step) => (
                <article key={step.label} className="public-panel grid gap-4 rounded-[18px] p-6 shadow-sm sm:grid-cols-[72px_1fr]">
                  <div className="text-sm font-semibold text-primary">{step.label}</div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell className="border-b-0">
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <SectionEyebrow>{site.platform.boundaryEyebrow}</SectionEyebrow>
            </div>
            <div className="lg:col-span-8">
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {site.platform.boundaryTitle}
              </h2>
              <div className="public-panel mt-8 space-y-3 rounded-[18px] p-6 shadow-sm">
                {site.platform.boundaryPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p className="text-sm leading-7 text-muted-foreground">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ContentShell>
      </SectionShell>
    </>
  );
}

function AboutPage({ site }: { site: SiteContent }) {
  return (
    <>
      <SectionShell>
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <SectionEyebrow>{site.about.storyEyebrow}</SectionEyebrow>
            </div>
            <div className="lg:col-span-8">
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {site.about.storyTitle}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{site.about.storyBody}</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {site.about.storyCards.map((card) => (
                  <article key={card.title} className="public-panel rounded-[18px] p-6 shadow-sm">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell className="border-b-0">
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <SectionEyebrow>{site.about.principlesEyebrow}</SectionEyebrow>
            </div>
            <div className="space-y-4 lg:col-span-8">
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {site.about.principlesTitle}
              </h2>
              {site.about.principles.map((principle) => (
                <article key={principle.title} className="public-panel rounded-[18px] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">{principle.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{principle.body}</p>
                </article>
              ))}
            </div>
          </div>
        </ContentShell>
      </SectionShell>
    </>
  );
}

function PartnersPage({ site }: { site: SiteContent }) {
  const cardClassName =
    "group public-panel rounded-[18px] p-6 shadow-sm transition-colors hover:border-primary/60 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4";

  return (
    <>
      <SectionShell>
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <SectionEyebrow>{site.partners.networkEyebrow}</SectionEyebrow>
            </div>
            <div className="lg:col-span-8">
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {site.partners.networkTitle}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{site.partners.networkBody}</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {site.partners.partnerCards.map((partner) =>
                  partner.href ? (
                    <a
                      key={partner.name}
                      href={partner.href}
                      target="_blank"
                      rel="noreferrer"
                      className={cardClassName}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Handshake className="size-4" />
                        <span>{partner.role}</span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{partner.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{partner.body}</p>
                      <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-foreground group-hover:text-primary">
                        <span>{partner.name}</span>
                        <ChevronRight className="size-4" />
                      </div>
                    </a>
                  ) : (
                    <article key={partner.name} className={cardClassName}>
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Handshake className="size-4" />
                        <span>{partner.role}</span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{partner.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{partner.body}</p>
                    </article>
                  ),
                )}
              </div>
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell className="border-b-0">
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <SectionEyebrow>{site.partners.impactEyebrow}</SectionEyebrow>
            </div>
            <div className="lg:col-span-8">
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {site.partners.impactTitle}
              </h2>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {site.partners.impactCards.map((card) => (
                  <article key={card.label} className="public-panel rounded-[18px] p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                    <p className="public-stat mt-3 text-3xl font-semibold tracking-tight text-foreground">{card.value}</p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.note}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </ContentShell>
      </SectionShell>
    </>
  );
}

function ClosingSection({
  locale,
  site,
  sourcePath,
  title,
  body,
}: {
  locale: Locale;
  site: SiteContent;
  sourcePath: string;
  title: string;
  body: string;
}) {
  return (
    <SectionShell className="border-b-0 pt-10">
      <ContentShell>
        <div className="public-panel public-shadow public-ornament relative overflow-hidden rounded-[24px] p-8 sm:p-10 lg:p-12">
          <div className="relative grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="flex flex-col justify-between gap-8">
              <div>
                <SectionEyebrow>Ciutatis</SectionEyebrow>
                <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">
                  {title}
                </h2>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{body}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="w-full rounded-[10px] px-6 sm:w-auto">
                  <Link to="/auth">
                    {site.common.openShell}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full rounded-[10px] border-border bg-background px-6 sm:w-auto"
                >
                  <a href="https://github.com/tebayoso/ciutatis" target="_blank" rel="noreferrer">
                    {site.common.readCode}
                  </a>
                </Button>
                <Button asChild size="lg" variant="ghost" className="w-full rounded-[10px] sm:w-auto">
                  <Link to={pathFor(locale, "home")}>{site.common.backHome}</Link>
                </Button>
              </div>
            </div>
            <div className="public-panel-soft rounded-[18px] p-6 shadow-sm sm:p-7">
              <SectionEyebrow>{site.contact.eyebrow}</SectionEyebrow>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {site.contact.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{site.contact.body}</p>
              <div className="mt-6">
                <ContactForm copy={site.contact.form} locale={locale} sourcePath={sourcePath} />
              </div>
            </div>
          </div>
        </div>
      </ContentShell>
    </SectionShell>
  );
}

function PublicNotFound({ locale, site }: { locale: Locale; site: SiteContent }) {
  return (
    <SectionShell className="border-b-0 pt-20">
      <ContentShell>
        <div className="public-panel mx-auto max-w-3xl rounded-[20px] p-10 text-center shadow-sm">
          <SectionEyebrow>404</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {site.common.pageNotFound}
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">{site.common.pageNotFoundBody}</p>
          <div className="mt-8">
            <Button asChild size="lg" className="rounded-[10px]">
              <Link to={pathFor(locale, "home")}>{site.common.backHome}</Link>
            </Button>
          </div>
        </div>
      </ContentShell>
    </SectionShell>
  );
}

function PageHero({ page }: { page: SiteContent["pages"][PageKey] }) {
  return (
    <SectionShell className="pt-10 sm:pt-14 lg:pt-18">
      <ContentShell>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <SectionEyebrow>{page.hero.eyebrow}</SectionEyebrow>
          </div>
          <div className="lg:col-span-8">
            <h1 className="public-display max-w-4xl text-5xl leading-[0.94] text-foreground sm:text-6xl lg:text-[5rem]">
              {page.hero.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
              {page.hero.body}
            </p>
          </div>
        </div>
      </ContentShell>
    </SectionShell>
  );
}

export function PublicSite() {
  const location = useLocation();
  const locale = useMemo(() => resolveLocale(location.pathname), [location.pathname]);
  const currentPage = useMemo(() => resolvePageKey(location.pathname, locale), [locale, location.pathname]);
  const site = SITE[locale];
  const page = currentPage ? site.pages[currentPage] : null;
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
  }, [setTheme, theme]);

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

    const pageTitle = page?.title ?? `${site.meta.defaultTitle} — 404`;
    const pageDescription = page?.description ?? site.meta.defaultDescription;
    const currentKey = currentPage ?? "home";
    const origin = window.location.origin;
    const canonicalHref = origin + pathFor(locale, currentKey);
    const alternateLocale: Locale = locale === "en" ? "es" : "en";

    document.documentElement.lang = locale;
    document.title = pageTitle;
    upsertMetaByName("description", pageDescription);
    upsertMetaByName("theme-color", "#ffffff");
    upsertMetaByProperty("og:title", pageTitle);
    upsertMetaByProperty("og:description", pageDescription);
    upsertMetaByProperty("og:type", "website");
    upsertMetaByProperty("og:url", canonicalHref);
    upsertMetaByProperty("og:image", origin + HOME_HERO_IMAGE);
    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:title", pageTitle);
    upsertMetaByName("twitter:description", pageDescription);
    upsertMetaByName("twitter:image", origin + HOME_HERO_IMAGE);
    upsertLink("canonical", canonicalHref);
    upsertLink("alternate", origin + pathFor(locale, currentKey), locale);
    upsertLink("alternate", origin + pathFor(alternateLocale, currentKey), alternateLocale);
    upsertLink("alternate", origin + "/en", "x-default");

    return () => {
      if (previousLangRef.current !== null) {
        document.documentElement.lang = previousLangRef.current;
      }
      if (previousTitleRef.current !== null) {
        document.title = previousTitleRef.current;
      }
      if (previousDescriptionRef.current !== null) {
        upsertMetaByName("description", previousDescriptionRef.current);
      }
      const canonical = document.head.querySelector('link[rel="canonical"]');
      if (canonical instanceof HTMLLinkElement) {
        canonical.remove();
      }
      document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((node) => node.remove());
    };
  }, [currentPage, locale, page, site]);

  return (
    <div className="public-site h-[100dvh] w-full overflow-y-auto bg-background text-foreground" data-locale={locale}>
      <div className="relative min-h-full bg-background">
        <div className="relative">
          <a
            href="#public-main"
            className="sr-only fixed left-4 top-4 z-50 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only"
          >
            {site.common.skipToContent}
          </a>
          <PublicHeader currentPage={currentPage ?? "home"} locale={locale} site={site} />

          <main id="public-main" className="pb-16 sm:pb-20 lg:pb-24">
            {currentPage === "home" && <HomePage locale={locale} site={site} sourcePath={location.pathname} />}
            {currentPage === "platform" && (
              <>
                <PageHero page={site.pages.platform} />
                <PlatformPage site={site} />
                <ClosingSection
                  locale={locale}
                  site={site}
                  sourcePath={location.pathname}
                  title={site.home.closeTitle}
                  body={site.home.closeBody}
                />
              </>
            )}
            {currentPage === "about" && (
              <>
                <PageHero page={site.pages.about} />
                <AboutPage site={site} />
                <ClosingSection
                  locale={locale}
                  site={site}
                  sourcePath={location.pathname}
                  title={site.home.closeTitle}
                  body={site.home.closeBody}
                />
              </>
            )}
            {currentPage === "partners" && (
              <>
                <PageHero page={site.pages.partners} />
                <PartnersPage site={site} />
                <ClosingSection
                  locale={locale}
                  site={site}
                  sourcePath={location.pathname}
                  title={site.home.closeTitle}
                  body={site.home.closeBody}
                />
              </>
            )}
            {currentPage === null && <PublicNotFound locale={locale} site={site} />}
          </main>

          <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
            <ContentShell>{site.footer}</ContentShell>
          </footer>
        </div>
      </div>
    </div>
  );
}
