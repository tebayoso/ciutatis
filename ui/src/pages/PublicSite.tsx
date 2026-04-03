import { useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Handshake,
  Landmark,
  Scale,
} from "lucide-react";

type Locale = "en" | "es";
type PageKey = "home" | "platform" | "about" | "partners";

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
    openShell: string;
    readCode: string;
    pageNotFound: string;
    pageNotFoundBody: string;
    backHome: string;
    xDefaultLabel: string;
  };
  pages: Record<
    PageKey,
    {
      title: string;
      description: string;
      eyebrow: string;
      heroTitle: string;
      heroBody: string;
    }
  >;
  home: {
    primaryCta: string;
    secondaryCta: string;
    statusCards: Array<{ label: string; value: string; note: string }>;
    audienceEyebrow: string;
    audienceTitle: string;
    audienceBody: string;
    audienceCards: Array<{ title: string; body: string }>;
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
    architectureCards: Array<{ title: string; body: string }>;
    governanceEyebrow: string;
    governanceTitle: string;
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
    partnerCards: Array<{ name: string; role: string; body: string; href: string }>;
    impactEyebrow: string;
    impactTitle: string;
    impactCards: Array<{ value: string; label: string; note: string }>;
  };
  footer: string;
};

const PAGE_SLUGS: Record<Locale, Record<PageKey, string>> = {
  en: {
    home: "",
    platform: "platform",
    about: "about",
    partners: "partners",
  },
  es: {
    home: "",
    platform: "plataforma",
    about: "nosotros",
    partners: "alianzas",
  },
};

const SITE: Record<Locale, SiteContent> = {
  en: {
    meta: {
      defaultTitle: "Ciutatis — Open-source civic control plane",
      defaultDescription:
        "Ciutatis is an open-source civic control plane for institutions that need governance, budget discipline, auditability, and deployable operating structure.",
    },
    nav: {
      mark: "Ciutatis",
      languageLabel: "Language",
      github: "GitHub",
      signIn: "Enter admin shell",
      links: {
        home: "Home",
        platform: "What we do",
        about: "Who we are",
        partners: "Partners & pilots",
      },
    },
    common: {
      currentStatus: "Current pilot network",
      currentStatusBody:
        "Ciutatis is advancing through a public-sector pilot network anchored in Tandil, UNICEN, and the local technology cluster while the platform matures into a deployable civic operating layer.",
      openShell: "Open the admin shell",
      readCode: "Read the code",
      pageNotFound: "Public page not found",
      pageNotFoundBody: "This page is not part of the current Ciutatis public site.",
      backHome: "Back to home",
      xDefaultLabel: "EN",
    },
    pages: {
      home: {
        title: "Ciutatis — Govern institutional work with clarity",
        description:
          "Open-source civic control plane for public institutions, municipal operations, and governed AI-assisted execution.",
        eyebrow: "Open-source civic control plane",
        heroTitle: "Govern institutional work with clarity, not improvisation.",
        heroBody:
          "Ciutatis gives public-service teams a structured operating surface for approvals, tasks, budgets, audit trails, and deployable city-specific runtimes. It is built for institutions that need autonomy to move — without losing visibility, limits, or responsibility.",
      },
      platform: {
        title: "What Ciutatis does — The platform",
        description:
          "See how Ciutatis structures governance, task execution, agent orchestration, budgets, and tenant runtimes inside one civic control plane.",
        eyebrow: "What we do",
        heroTitle: "A control plane for governed public execution.",
        heroBody:
          "Ciutatis organizes institutions the way generic workflow software does not: through explicit authority, task lineage, cost discipline, and a clear separation between the public front door, the institutional shell, and each deployable runtime.",
      },
      about: {
        title: "Who we are — About Ciutatis",
        description:
          "Ciutatis is an open-source civic platform built in Argentina to help institutions operate AI-assisted workflows with public accountability.",
        eyebrow: "Who we are",
        heroTitle: "Built in Argentina for institutions that need accountable modernization.",
        heroBody:
          "Ciutatis is an open-source civic platform maintained by The Hipster Cloud S.A. It adapts the control-plane model of AI-native operations to public-service environments where governance, oversight, and local deployment constraints cannot be treated as afterthoughts.",
      },
      partners: {
        title: "Partners & pilots — Ciutatis",
        description:
          "Current Ciutatis pilot and validation network across Tandil, UNICEN, and the local technology cluster.",
        eyebrow: "Partners & pilots",
        heroTitle: "A pilot and validation network grounded in real public-service contexts.",
        heroBody:
          "Ciutatis is not being framed in the abstract. Its current network combines a municipality, a public university, and a regional technology cluster to validate operations, impact, and deployment readiness in LATAM contexts.",
      },
    },
    home: {
      primaryCta: "See the platform",
      secondaryCta: "Meet the pilot network",
      statusCards: [
        {
          label: "Prototype benchmark",
          value: "70% faster",
          note: "Reduction in processing time across simulated municipal workflows documented in current project materials.",
        },
        {
          label: "Pilot timing",
          value: "Q3 2026",
          note: "Confirmed pilot window with Municipalidad de Tandil and UNICEN.",
        },
        {
          label: "36‑month reach goal",
          value: "2–5M citizens",
          note: "Target reach across 5–10 municipalities as the rollout scales.",
        },
      ],
      audienceEyebrow: "Who it serves",
      audienceTitle: "Designed for institutions that need structure before scale.",
      audienceBody:
        "Ciutatis is strongest where work is politically sensitive, operationally complex, and expensive to mismanage. It gives every actor a clearer operating surface without flattening the realities of government and institutional delivery.",
      audienceCards: [
        {
          title: "Leadership and modernization teams",
          body: "Track where work is moving, what is blocked, and which decisions still require formal approval or intervention.",
        },
        {
          title: "Operators and departmental teams",
          body: "Run requests, handoffs, and follow-through through explicit tasks, comments, statuses, and ownership instead of email chains and spreadsheet drift.",
        },
        {
          title: "Implementation and rollout teams",
          body: "Provision runtimes per city or institution while preserving a central shell for support, defaults, and deployment governance.",
        },
      ],
      featuredEyebrow: "Public site",
      featuredTitle: "A clearer way to understand Ciutatis.",
      featuredCards: [
        {
          page: "platform",
          title: "What we do",
          body: "The operating model, governance loop, and structural boundaries behind the platform.",
        },
        {
          page: "about",
          title: "Who we are",
          body: "The open-source mission, the Argentine build context, and the principles shaping the product.",
        },
        {
          page: "partners",
          title: "Partners & pilots",
          body: "The current network helping validate Ciutatis in municipal and institutional workflows.",
        },
      ],
      loopEyebrow: "How it works",
      loopTitle: "The board stays in control while the system keeps moving.",
      loopBody:
        "The current V1 contract is explicit: a human board defines goals, creates agents and structures, tracks work through tasks and comments, monitors costs, and can intervene anywhere in the loop.",
      loopSteps: [
        {
          label: "01",
          title: "Define the objective and institutional structure",
          body: "Companies, goals, projects, and reporting lines establish why work exists and who is responsible for it.",
        },
        {
          label: "02",
          title: "Execute through tasks, comments, and heartbeat-driven agents",
          body: "Work stays attached to concrete objects with explicit assignees, visible state transitions, and auditable activity.",
        },
        {
          label: "03",
          title: "Govern costs, approvals, and interventions",
          body: "Budget limits can stop work, approvals remain in the operating loop, and leadership can pause or redirect execution at any point.",
        },
      ],
      closeTitle: "Open-source civic infrastructure for institutions that need proof, not theater.",
      closeBody:
        "Ciutatis is for institutions that want a governed operating layer for AI-assisted work — one that can be inspected, deployed, and improved in the open.",
    },
    platform: {
      architectureEyebrow: "Operating architecture",
      architectureTitle: "One platform, three boundaries that stay legible.",
      architectureBody:
        "The public site, the institutional shell, and each tenant runtime should not collapse into one undifferentiated surface. Ciutatis is being shaped to keep each responsibility explicit.",
      architectureCards: [
        {
          title: "Public layer",
          body: "Explains the model, frames the institutional promise, and gives external stakeholders a credible front door.",
        },
        {
          title: "Institutional shell",
          body: "Holds provisioning, support, defaults, governance, onboarding, and strategic oversight across deployments.",
        },
        {
          title: "Tenant runtime",
          body: "Provides a deployable operating surface for a city or institution, with its own routing identity and lifecycle.",
        },
      ],
      governanceEyebrow: "Governance loop",
      governanceTitle: "The V1 product contract is intentionally strict.",
      governanceSteps: [
        {
          label: "A",
          title: "A human board defines goals and company structure",
          body: "Ciutatis treats companies as first-order entities and keeps all meaningful work tied back to the company goal chain.",
        },
        {
          label: "B",
          title: "Agents operate inside a reporting tree, not a free-for-all",
          body: "Each agent has a role, manager, adapter, capabilities, and budget context.",
        },
        {
          label: "C",
          title: "Tasks and comments stay attached to work objects",
          body: "The system is not a chatbot. Communication lives on issues and comments so context remains inspectable.",
        },
        {
          label: "D",
          title: "Costs and approvals are part of execution, not an afterthought",
          body: "Monthly budget windows, hard-stop enforcement, and approval gates are part of the operating fabric.",
        },
      ],
      boundaryEyebrow: "What Ciutatis is not",
      boundaryTitle: "The product stays narrow where that discipline matters.",
      boundaryPoints: [
        "It is not a general chat app; work is anchored to tasks, projects, goals, and approvals.",
        "It is not a drag-and-drop workflow toy; it models institutions with reporting lines, budgets, and governance.",
        "It is not a code review product; it orchestrates work and leaves execution tools free to run where they run best.",
      ],
    },
    about: {
      storyEyebrow: "Mission and origin",
      storyTitle: "A civic fork, an Argentine build context, and an open-source operating stance.",
      storyBody:
        "Ciutatis is a civic adaptation of the Paperclip codebase. It is maintained as open-source software and publicly framed around institutions, departments, and municipal operations rather than generic startup task management.",
      storyCards: [
        {
          title: "Built by The Hipster Cloud S.A.",
          body: "The organization behind Ciutatis is headquartered in Argentina and documented in current project materials as a social enterprise with an explicit public-impact focus.",
        },
        {
          title: "Grounded in public-service workflows",
          body: "The current problem framing centers on permits, licenses, documentation, inter-departmental routing, and the administrative burden of municipal service delivery in LATAM.",
        },
        {
          title: "Open by design",
          body: "Ciutatis is presented as open-source civic infrastructure, designed to be inspected, improved, and locally deployed rather than hidden behind opaque platform claims.",
        },
      ],
      principlesEyebrow: "Design principles",
      principlesTitle: "The public promise has to match the operating reality.",
      principles: [
        {
          title: "Human oversight remains inside the loop",
          body: "Current project materials explicitly commit to human review for consequential outputs and to human intervention when the system needs it.",
        },
        {
          title: "Local deployment and data restraint matter",
          body: "The platform is framed around keeping sensitive public-sector data inside the municipality or institution rather than centralizing it unnecessarily.",
        },
        {
          title: "Clarity beats theatrics",
          body: "Ciutatis favors legible tasks, explicit approvals, budget boundaries, and audit visibility over vague claims about frictionless automation.",
        },
      ],
    },
    partners: {
      networkEyebrow: "Current network",
      networkTitle: "Pilot and validation partners already attached to the project.",
      networkBody:
        "The current public evidence around Ciutatis is not hypothetical. Existing materials document a network intended to validate municipal deployment, institutional workflows, impact assessment, and regional adoption support.",
      partnerCards: [
        {
          name: "Municipalidad de Tandil",
          role: "Municipal pilot partner",
          body: "Documented as the first production pilot target for permits, licensing, and public works, with committed infrastructure, staff time, and historical permit data for a Q3 2026 pilot.",
          href: "https://tandil.gov.ar",
        },
        {
          name: "UNICEN",
          role: "Institutional validation partner",
          body: "Documented as a public-university pilot for administrative workflows, research validation, independent impact assessment, and platform development support through local academic talent.",
          href: "https://unicen.edu.ar",
        },
        {
          name: "Cluster Tecnológico de Tandil",
          role: "Scaling and ecosystem partner",
          body: "Documented as a regional technology-network partner contributing technical talent, testing environments, and local credibility for broader adoption across the Tandil ecosystem.",
          href: "https://clustertecnologicotandil.org.ar",
        },
      ],
      impactEyebrow: "Documented targets",
      impactTitle: "What the current rollout aims to prove.",
      impactCards: [
        {
          value: "45 → 10 days",
          label: "Target processing-time shift",
          note: "Current materials describe an expected move from 45 days average to 10 days average for requests in pilot conditions.",
        },
        {
          value: "3–4 → 0–1 visits",
          label: "Citizen office visits per request",
          note: "The project goal is to reduce repeated in-person visits through a single operating surface and better routing.",
        },
        {
          value: "3–5× capacity",
          label: "Target staff throughput gain",
          note: "Current outcome framing aims to let staff handle significantly more requests without simply scaling headcount.",
        },
      ],
    },
    footer: "Open-source civic control plane for governed institutional execution.",
  },
  es: {
    meta: {
      defaultTitle: "Ciutatis — Capa de control cívica de código abierto",
      defaultDescription:
        "Ciutatis es una capa de control cívica de código abierto para instituciones que necesitan gobernanza, disciplina presupuestaria, trazabilidad y estructura operativa desplegable.",
    },
    nav: {
      mark: "Ciutatis",
      languageLabel: "Idioma",
      github: "GitHub",
      signIn: "Entrar al panel institucional",
      links: {
        home: "Inicio",
        platform: "Qué hacemos",
        about: "Quiénes somos",
        partners: "Alianzas y pilotos",
      },
    },
    common: {
      currentStatus: "Red actual de pilotos",
      currentStatusBody:
        "Ciutatis avanza a través de una red de validación en el sector público con base en Tandil, UNICEN y el ecosistema tecnológico local, mientras la plataforma madura hacia una capa operativa cívica desplegable.",
      openShell: "Abrir el panel institucional",
      readCode: "Leer el código",
      pageNotFound: "Página pública no encontrada",
      pageNotFoundBody: "Esta página no forma parte del sitio público actual de Ciutatis.",
      backHome: "Volver al inicio",
      xDefaultLabel: "EN",
    },
    pages: {
      home: {
        title: "Ciutatis — Gobernar trabajo institucional con claridad",
        description:
          "Capa de control cívica de código abierto para instituciones públicas, operaciones municipales y ejecución asistida por IA con gobernanza.",
        eyebrow: "Capa de control cívica de código abierto",
        heroTitle: "Gobierne trabajo institucional con claridad, no con improvisación.",
        heroBody:
          "Ciutatis da a equipos públicos una superficie operativa estructurada para aprobaciones, tareas, presupuestos, trazabilidad y runtimes desplegables por ciudad. Está hecho para instituciones que necesitan autonomía para avanzar sin perder visibilidad, límites ni responsabilidad.",
      },
      platform: {
        title: "Qué hace Ciutatis — La plataforma",
        description:
          "Cómo Ciutatis estructura gobernanza, ejecución de tareas, orquestación de agentes, presupuestos y runtimes inquilinos dentro de una misma capa de control cívica.",
        eyebrow: "Qué hacemos",
        heroTitle: "Una capa de control para ejecución pública gobernada.",
        heroBody:
          "Ciutatis organiza instituciones de una manera que el software genérico de flujo de trabajo no resuelve: con autoridad explícita, linaje de tareas, disciplina de costos y una separación clara entre la puerta pública, el panel institucional y cada runtime desplegable.",
      },
      about: {
        title: "Quiénes somos — Ciutatis",
        description:
          "Ciutatis es una plataforma cívica de código abierto construida en Argentina para ayudar a instituciones a operar flujos asistidos por IA con responsabilidad pública.",
        eyebrow: "Quiénes somos",
        heroTitle: "Construido en Argentina para instituciones que necesitan modernización con responsabilidad.",
        heroBody:
          "Ciutatis es una plataforma cívica de código abierto mantenida por The Hipster Cloud S.A. Adapta el modelo de control plane de operaciones nativas de IA a entornos públicos donde la gobernanza, la supervisión y las restricciones de despliegue local no pueden tratarse como detalles secundarios.",
      },
      partners: {
        title: "Alianzas y pilotos — Ciutatis",
        description:
          "Red actual de pilotos y validación de Ciutatis entre Tandil, UNICEN y el clúster tecnológico local.",
        eyebrow: "Alianzas y pilotos",
        heroTitle: "Una red de pilotos y validación anclada en contextos reales de servicio público.",
        heroBody:
          "Ciutatis no se está planteando en abstracto. Su red actual combina un municipio, una universidad pública y un clúster tecnológico regional para validar operación, impacto y preparación de despliegue en contextos LATAM.",
      },
    },
    home: {
      primaryCta: "Ver la plataforma",
      secondaryCta: "Conocer la red de pilotos",
      statusCards: [
        {
          label: "Benchmark del prototipo",
          value: "70% más rápido",
          note: "Reducción de tiempo de procesamiento en flujos municipales simulados documentada en materiales actuales del proyecto.",
        },
        {
          label: "Ventana de pilotos",
          value: "Q3 2026",
          note: "Período de piloto confirmado con Municipalidad de Tandil y UNICEN.",
        },
        {
          label: "Objetivo a 36 meses",
          value: "2–5M de personas",
          note: "Alcance esperado a través de 5–10 municipios a medida que el despliegue escale.",
        },
      ],
      audienceEyebrow: "A quién sirve",
      audienceTitle: "Diseñado para instituciones que necesitan estructura antes de escala.",
      audienceBody:
        "Ciutatis es especialmente valioso donde el trabajo es políticamente sensible, operativamente complejo y costoso de gestionar mal. Da a cada actor una superficie operativa más clara sin simplificar artificialmente la realidad del sector público.",
      audienceCards: [
        {
          title: "Conducción y equipos de modernización",
          body: "Permite ver dónde se mueve el trabajo, qué está bloqueado y qué decisiones todavía requieren aprobación o intervención formal.",
        },
        {
          title: "Operadores y equipos departamentales",
          body: "Ordena pedidos, handoffs y seguimiento mediante tareas explícitas, comentarios, estados y responsables, en lugar de cadenas de correo y deriva operativa.",
        },
        {
          title: "Equipos de implementación y despliegue",
          body: "Hace posible aprovisionar runtimes por ciudad o institución mientras se conserva un panel central para soporte, configuraciones base y gobernanza del despliegue.",
        },
      ],
      featuredEyebrow: "Sitio público",
      featuredTitle: "Una manera más clara de entender Ciutatis.",
      featuredCards: [
        {
          page: "platform",
          title: "Qué hacemos",
          body: "El modelo operativo, el ciclo de gobernanza y los límites estructurales que sostienen la plataforma.",
        },
        {
          page: "about",
          title: "Quiénes somos",
          body: "La misión de código abierto, el contexto argentino de construcción y los principios que moldean el producto.",
        },
        {
          page: "partners",
          title: "Alianzas y pilotos",
          body: "La red actual que ayuda a validar Ciutatis en flujos municipales e institucionales reales.",
        },
      ],
      loopEyebrow: "Cómo funciona",
      loopTitle: "La conducción conserva el control mientras el sistema sigue avanzando.",
      loopBody:
        "El contrato V1 actual es explícito: una conducción humana define objetivos, crea agentes y estructura, sigue el trabajo mediante tareas y comentarios, monitorea costos y puede intervenir en cualquier punto del ciclo.",
      loopSteps: [
        {
          label: "01",
          title: "Definir el objetivo y la estructura institucional",
          body: "Empresas, objetivos, proyectos y líneas de reporte establecen por qué existe el trabajo y quién responde por él.",
        },
        {
          label: "02",
          title: "Ejecutar mediante tareas, comentarios y agentes disparados por heartbeat",
          body: "El trabajo queda ligado a objetos concretos con responsables explícitos, transiciones visibles y actividad auditable.",
        },
        {
          label: "03",
          title: "Gobernar costos, aprobaciones e intervenciones",
          body: "Los límites presupuestarios pueden detener trabajo, las aprobaciones siguen dentro del circuito y la conducción puede pausar o reorientar la ejecución en cualquier momento.",
        },
      ],
      closeTitle: "Infraestructura cívica de código abierto para instituciones que necesitan prueba, no discurso.",
      closeBody:
        "Ciutatis está hecho para instituciones que quieren una capa operativa gobernada para trabajo asistido por IA: una que pueda inspeccionarse, desplegarse y mejorarse de forma abierta.",
    },
    platform: {
      architectureEyebrow: "Arquitectura operativa",
      architectureTitle: "Una plataforma, tres límites que deben seguir siendo legibles.",
      architectureBody:
        "El sitio público, el panel institucional y cada runtime inquilino no deberían colapsar en una sola superficie indiferenciada. Ciutatis está siendo diseñado para mantener cada responsabilidad explícita.",
      architectureCards: [
        {
          title: "Capa pública",
          body: "Explica el modelo, ordena la promesa institucional y ofrece una puerta de entrada creíble para actores externos.",
        },
        {
          title: "Panel institucional",
          body: "Concentra aprovisionamiento, soporte, configuraciones base, onboarding y supervisión estratégica entre despliegues.",
        },
        {
          title: "Runtime inquilino",
          body: "Brinda una superficie operativa desplegable para una ciudad o institución, con identidad de ruteo y ciclo de vida propios.",
        },
      ],
      governanceEyebrow: "Ciclo de gobernanza",
      governanceTitle: "El contrato de producto V1 es deliberadamente estricto.",
      governanceSteps: [
        {
          label: "A",
          title: "Una conducción humana define objetivos y estructura",
          body: "Ciutatis trata a las empresas como entidades de primer orden y exige que todo trabajo significativo pueda trazarse hasta una cadena de objetivos.",
        },
        {
          label: "B",
          title: "Los agentes operan dentro de un árbol de reporte, no de un caos horizontal",
          body: "Cada agente tiene rol, responsable, adaptador, capacidades y contexto presupuestario.",
        },
        {
          label: "C",
          title: "Las tareas y comentarios permanecen unidos a objetos de trabajo",
          body: "El sistema no es un chat genérico. La comunicación vive en issues y comentarios para que el contexto siga siendo auditable.",
        },
        {
          label: "D",
          title: "Costos y aprobaciones forman parte de la ejecución",
          body: "Ventanas presupuestarias mensuales, hard-stops y puertas de aprobación forman parte del tejido operativo.",
        },
      ],
      boundaryEyebrow: "Lo que Ciutatis no es",
      boundaryTitle: "El producto se mantiene acotado donde esa disciplina importa.",
      boundaryPoints: [
        "No es una app de chat generalista; el trabajo queda anclado a tareas, proyectos, objetivos y aprobaciones.",
        "No es un juguete de flujos drag-and-drop; modela instituciones con jerarquías, presupuestos y gobernanza.",
        "No es un producto de code review; orquesta trabajo y deja que las herramientas de ejecución corran donde mejor les convenga.",
      ],
    },
    about: {
      storyEyebrow: "Misión y origen",
      storyTitle: "Un fork cívico, un contexto de construcción argentino y una postura operativa abierta.",
      storyBody:
        "Ciutatis es una adaptación cívica del código de Paperclip. Se mantiene como software de código abierto y se presenta públicamente alrededor de instituciones, departamentos y operaciones municipales, no como una herramienta genérica de productividad.",
      storyCards: [
        {
          title: "Construido por The Hipster Cloud S.A.",
          body: "La organización detrás de Ciutatis tiene base en Argentina y aparece documentada en materiales actuales del proyecto como empresa social con propósito explícito de impacto público.",
        },
        {
          title: "Anclado en flujos reales de servicio público",
          body: "El problema actual se formula alrededor de permisos, licencias, documentación, ruteo inter-departamental y la carga administrativa de la gestión pública en LATAM.",
        },
        {
          title: "Abierto por diseño",
          body: "Ciutatis se presenta como infraestructura cívica de código abierto, pensada para ser inspeccionada, mejorada y desplegada localmente, no para esconderse detrás de promesas opacas de plataforma.",
        },
      ],
      principlesEyebrow: "Principios de diseño",
      principlesTitle: "La promesa pública tiene que coincidir con la realidad operativa.",
      principles: [
        {
          title: "La supervisión humana sigue dentro del ciclo",
          body: "Los materiales actuales del proyecto se comprometen explícitamente con revisión humana para resultados sensibles y con intervención humana cuando el sistema lo requiere.",
        },
        {
          title: "Importan el despliegue local y la restricción de datos",
          body: "La plataforma está planteada para mantener datos sensibles del sector público dentro del municipio o de la institución, en lugar de centralizarlos sin necesidad.",
        },
        {
          title: "La claridad importa más que el espectáculo",
          body: "Ciutatis prioriza tareas legibles, aprobaciones explícitas, límites presupuestarios y visibilidad auditable por encima de slogans vacíos sobre automatización sin fricción.",
        },
      ],
    },
    partners: {
      networkEyebrow: "Red actual",
      networkTitle: "Pilotos y alianzas de validación ya conectados al proyecto.",
      networkBody:
        "La evidencia pública actual alrededor de Ciutatis no es hipotética. Los materiales disponibles documentan una red pensada para validar despliegue municipal, flujos institucionales, medición de impacto y soporte de adopción regional.",
      partnerCards: [
        {
          name: "Municipalidad de Tandil",
          role: "Socio piloto municipal",
          body: "Documentado como primer objetivo de piloto productivo para permisos, licencias y obras públicas, con infraestructura comprometida, tiempo de staff y datos históricos para un piloto en Q3 2026.",
          href: "https://tandil.gov.ar",
        },
        {
          name: "UNICEN",
          role: "Socio de validación institucional",
          body: "Documentado como piloto en una universidad pública para flujos administrativos, validación académica, evaluación independiente de impacto y apoyo al desarrollo con talento local.",
          href: "https://unicen.edu.ar",
        },
        {
          name: "Cluster Tecnológico de Tandil",
          role: "Socio de escalamiento y ecosistema",
          body: "Documentado como aliado regional para aportar talento técnico, entornos de prueba y credibilidad local en una futura adopción más amplia dentro del ecosistema de Tandil.",
          href: "https://clustertecnologicotandil.org.ar",
        },
      ],
      impactEyebrow: "Objetivos documentados",
      impactTitle: "Qué busca demostrar el despliegue actual.",
      impactCards: [
        {
          value: "45 → 10 días",
          label: "Cambio esperado en tiempos",
          note: "Los materiales actuales describen como objetivo pasar de 45 días promedio a 10 días promedio para pedidos en condiciones piloto.",
        },
        {
          value: "3–4 → 0–1 visitas",
          label: "Visitas presenciales por trámite",
          note: "El objetivo del proyecto es reducir visitas repetidas mediante una sola superficie operativa y mejor ruteo.",
        },
        {
          value: "3–5× capacidad",
          label: "Aumento esperado de productividad",
          note: "La formulación actual del impacto apunta a que el staff pueda gestionar significativamente más solicitudes sin aumentar simplemente la dotación.",
        },
      ],
    },
    footer: "Capa de control cívica de código abierto para ejecución institucional gobernada.",
  },
};

function resolveLocale(pathname: string): Locale {
  return pathname === "/es" || pathname.startsWith("/es/") ? "es" : "en";
}

function resolvePageKey(pathname: string, locale: Locale): PageKey | null {
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[1] ?? "";
  const matches = Object.entries(PAGE_SLUGS[locale]).find(([, value]) => value === slug);
  return (matches?.[0] as PageKey | undefined) ?? (slug === "" ? "home" : null);
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

function PublicSectionLabel({ children }: { children: string }) {
  return <p className="text-[11px] uppercase tracking-[0.28em] text-[#6e7f8f]">{children}</p>;
}

function PublicPageGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-px overflow-hidden border border-[#d5dce3] bg-[#d5dce3] lg:grid-cols-3">{children}</div>;
}

function PublicCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <article
      className={cn(
        "bg-[rgba(255,255,255,0.93)] p-7 shadow-[0_18px_45px_rgba(36,53,72,0.05)] sm:p-8",
        className,
      )}
    >
      {children}
    </article>
  );
}

function PublicPageHeader(props: {
  locale: Locale;
  site: SiteContent;
  currentPage: PageKey;
}) {
  const alternateLocale: Locale = props.locale === "en" ? "es" : "en";

  return (
    <header className="sticky top-0 z-40 border-b border-[#d5dce3]/80 bg-[rgba(246,244,239,0.9)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:px-10">
        <Link className="flex items-center gap-3 text-[#112033]" to={pathFor(props.locale, "home")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d5dce3] bg-white shadow-[0_8px_24px_rgba(36,53,72,0.07)]">
            <Landmark className="h-4 w-4 text-[#8a6038]" />
          </div>
          <div>
            <div className="font-serif text-lg font-semibold tracking-[0.08em]">{props.site.nav.mark}</div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[#6e7f8f]">{props.site.pages.home.eyebrow}</div>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {(Object.keys(props.site.nav.links) as PageKey[]).map((page) => {
            const active = page === props.currentPage;
            return (
              <Link
                key={page}
                className={cn(
                  "inline-flex items-center border px-3 py-2 text-[11px] uppercase tracking-[0.24em] transition-colors",
                  active
                    ? "border-[#243548] bg-[#243548] text-[#f7f4ee]"
                    : "border-transparent text-[#5a6a79] hover:border-[#d5dce3] hover:bg-white hover:text-[#112033]",
                )}
                to={pathFor(props.locale, page)}
              >
                {props.site.nav.links[page]}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-[#d5dce3] bg-white px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-[#6e7f8f] sm:flex">
            <span>{props.site.nav.languageLabel}</span>
            <Link className="font-semibold text-[#112033] transition-colors hover:text-[#8a6038]" to={pathFor(alternateLocale, props.currentPage)}>
              {props.locale === "en" ? "ES" : props.site.common.xDefaultLabel}
            </Link>
          </div>
          <a
            className="hidden text-sm font-medium text-[#5a6a79] transition-colors hover:text-[#112033] sm:inline-flex"
            href="https://github.com/tebayoso/ciutatis"
            target="_blank"
            rel="noreferrer"
          >
            {props.site.nav.github}
          </a>
          <Button asChild className="rounded-none border border-[#112033] bg-[#112033] px-4 text-xs uppercase tracking-[0.18em] text-white hover:bg-[#1d3045] sm:px-5">
            <Link to="/auth">{props.site.nav.signIn}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function HomePage({ locale, site }: { locale: Locale; site: SiteContent }) {
  return (
    <>
      <section className="grid gap-14 border-b border-[#d5dce3] pb-16 pt-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-end lg:pb-24">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 border border-[#d5dce3] bg-white px-4 py-2 text-[11px] uppercase tracking-[0.26em] text-[#5a6a79] shadow-[0_18px_40px_rgba(36,53,72,0.05)]">
            <Scale className="h-3.5 w-3.5 text-[#8a6038]" />
            {site.pages.home.eyebrow}
          </div>

          <div className="space-y-6">
            <h1 className="max-w-4xl font-serif text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-[#112033] md:text-7xl">
              {site.pages.home.heroTitle}
            </h1>
            <p className="max-w-3xl font-serif text-xl leading-9 text-[#304556] md:text-2xl">
              {site.pages.home.heroBody}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-none border border-[#112033] bg-[#112033] px-6 py-6 text-xs uppercase tracking-[0.22em] text-white hover:bg-[#1d3045]">
              <Link to={pathFor(locale, "platform")}>
                {site.home.primaryCta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-none border-[#9aa9b5] bg-white/80 px-6 py-6 text-xs uppercase tracking-[0.22em] text-[#304556] hover:border-[#304556] hover:bg-white hover:text-[#112033]">
              <Link to={pathFor(locale, "partners")}>{site.home.secondaryCta}</Link>
            </Button>
          </div>
        </div>

        <aside className="relative overflow-hidden border border-[#d5dce3] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,241,246,0.94)_100%)] p-7 shadow-[0_30px_80px_rgba(36,53,72,0.09)]">
          <div className="absolute inset-y-0 left-0 w-px bg-[linear-gradient(180deg,transparent,#35526c,transparent)] opacity-55" />
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#8a6038,transparent)] opacity-55" />
          <div className="space-y-6">
            <div className="space-y-3 border-b border-[#d5dce3] pb-5">
              <PublicSectionLabel>{site.common.currentStatus}</PublicSectionLabel>
              <p className="font-serif text-2xl leading-tight text-[#112033]">{site.common.currentStatusBody}</p>
            </div>
            <div className="space-y-4">
              {site.home.statusCards.map((card) => (
                <div key={card.label} className="border-b border-[#e2e8ef] pb-4 last:border-b-0 last:pb-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#6e7f8f]">{card.label}</p>
                  <p className="mt-2 font-serif text-3xl text-[#112033]">{card.value}</p>
                  <p className="mt-2 text-sm leading-7 text-[#486071]">{card.note}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-10 border-b border-[#d5dce3] py-16 lg:grid-cols-[0.72fr_1.28fr] lg:py-24">
        <div>
          <PublicSectionLabel>{site.home.audienceEyebrow}</PublicSectionLabel>
        </div>
        <div className="space-y-8">
          <div className="space-y-5">
            <h2 className="max-w-3xl font-serif text-3xl leading-tight text-[#112033] md:text-5xl">{site.home.audienceTitle}</h2>
            <p className="max-w-3xl text-lg leading-9 text-[#304556]">{site.home.audienceBody}</p>
          </div>
          <PublicPageGrid>
            {site.home.audienceCards.map((card) => (
              <PublicCard key={card.title}>
                <h3 className="font-serif text-2xl leading-tight text-[#112033]">{card.title}</h3>
                <p className="mt-4 text-sm leading-8 text-[#486071]">{card.body}</p>
              </PublicCard>
            ))}
          </PublicPageGrid>
        </div>
      </section>

      <section className="grid gap-10 border-b border-[#d5dce3] py-16 lg:grid-cols-[0.72fr_1.28fr] lg:py-24">
        <div>
          <PublicSectionLabel>{site.home.featuredEyebrow}</PublicSectionLabel>
        </div>
        <div className="space-y-8">
          <h2 className="max-w-3xl font-serif text-3xl leading-tight text-[#112033] md:text-5xl">{site.home.featuredTitle}</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {site.home.featuredCards.map((card) => (
              <Link
                key={card.page}
                className="group border border-[#d5dce3] bg-white/90 p-7 shadow-[0_16px_40px_rgba(36,53,72,0.05)] transition-transform hover:-translate-y-0.5"
                to={pathFor(locale, card.page)}
              >
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#6e7f8f]">{site.nav.links[card.page]}</p>
                <h3 className="mt-4 font-serif text-2xl text-[#112033]">{card.title}</h3>
                <p className="mt-4 text-sm leading-8 text-[#486071]">{card.body}</p>
                <div className="mt-6 inline-flex items-center text-sm font-medium text-[#24415d] transition-colors group-hover:text-[#8a6038]">
                  <span>{site.nav.links[card.page]}</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-12 border-b border-[#d5dce3] py-16 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:py-24">
        <div className="space-y-4">
          <PublicSectionLabel>{site.home.loopEyebrow}</PublicSectionLabel>
          <h2 className="font-serif text-3xl leading-tight text-[#112033] md:text-4xl">{site.home.loopTitle}</h2>
          <p className="text-base leading-8 text-[#304556]">{site.home.loopBody}</p>
        </div>
        <div className="space-y-6">
          {site.home.loopSteps.map((step) => (
            <PublicCard key={step.label} className="grid gap-5 border border-[#d5dce3] md:grid-cols-[84px_1fr]">
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#6e7f8f]">{step.label}</div>
              <div>
                <h3 className="font-serif text-2xl text-[#112033]">{step.title}</h3>
                <p className="mt-3 text-sm leading-8 text-[#486071]">{step.body}</p>
              </div>
            </PublicCard>
          ))}
        </div>
      </section>

      <ClosingSection locale={locale} site={site} title={site.home.closeTitle} body={site.home.closeBody} />
    </>
  );
}

function PlatformPage({ site }: { site: SiteContent }) {
  return (
    <>
      <section className="grid gap-10 border-b border-[#d5dce3] pb-16 pt-10 lg:grid-cols-[0.72fr_1.28fr] lg:pb-24">
        <div>
          <PublicSectionLabel>{site.platform.architectureEyebrow}</PublicSectionLabel>
        </div>
        <div className="space-y-5">
          <h2 className="max-w-3xl font-serif text-4xl leading-tight text-[#112033] md:text-6xl">{site.platform.architectureTitle}</h2>
          <p className="max-w-3xl text-lg leading-9 text-[#304556]">{site.platform.architectureBody}</p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <PublicPageGrid>
          {site.platform.architectureCards.map((card) => (
            <PublicCard key={card.title}>
              <h3 className="font-serif text-2xl leading-tight text-[#112033]">{card.title}</h3>
              <p className="mt-4 text-sm leading-8 text-[#486071]">{card.body}</p>
            </PublicCard>
          ))}
        </PublicPageGrid>
      </section>

      <section className="grid gap-12 border-b border-[#d5dce3] py-16 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:py-24">
        <div className="space-y-4">
          <PublicSectionLabel>{site.platform.governanceEyebrow}</PublicSectionLabel>
          <h2 className="font-serif text-3xl leading-tight text-[#112033] md:text-4xl">{site.platform.governanceTitle}</h2>
        </div>
        <div className="space-y-6">
          {site.platform.governanceSteps.map((step) => (
            <article key={step.label} className="grid gap-4 border-b border-[#d5dce3] pb-6 last:border-b-0 last:pb-0 md:grid-cols-[64px_1fr]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#6e7f8f]">{step.label}</div>
              <div>
                <h3 className="font-serif text-2xl text-[#112033]">{step.title}</h3>
                <p className="mt-3 text-sm leading-8 text-[#486071]">{step.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-10 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:py-24">
        <div>
          <PublicSectionLabel>{site.platform.boundaryEyebrow}</PublicSectionLabel>
        </div>
        <div className="space-y-8">
          <h2 className="max-w-3xl font-serif text-3xl leading-tight text-[#112033] md:text-5xl">{site.platform.boundaryTitle}</h2>
          <div className="space-y-4 border border-[#d5dce3] bg-white/90 p-8 shadow-[0_18px_45px_rgba(36,53,72,0.05)]">
            {site.platform.boundaryPoints.map((point) => (
              <div key={point} className="flex gap-3">
                <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-[#35526c]" />
                <p className="text-sm leading-8 text-[#486071]">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function AboutPage({ site }: { site: SiteContent }) {
  return (
    <>
      <section className="grid gap-10 border-b border-[#d5dce3] pb-16 pt-10 lg:grid-cols-[0.72fr_1.28fr] lg:pb-24">
        <div>
          <PublicSectionLabel>{site.about.storyEyebrow}</PublicSectionLabel>
        </div>
        <div className="space-y-5">
          <h2 className="max-w-3xl font-serif text-4xl leading-tight text-[#112033] md:text-6xl">{site.about.storyTitle}</h2>
          <p className="max-w-3xl text-lg leading-9 text-[#304556]">{site.about.storyBody}</p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="grid gap-6 lg:grid-cols-3">
          {site.about.storyCards.map((card) => (
            <PublicCard key={card.title} className="border border-[#d5dce3]">
              <h3 className="font-serif text-2xl leading-tight text-[#112033]">{card.title}</h3>
              <p className="mt-4 text-sm leading-8 text-[#486071]">{card.body}</p>
            </PublicCard>
          ))}
        </div>
      </section>

      <section className="grid gap-10 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:py-24">
        <div>
          <PublicSectionLabel>{site.about.principlesEyebrow}</PublicSectionLabel>
        </div>
        <div className="space-y-8">
          <h2 className="max-w-3xl font-serif text-3xl leading-tight text-[#112033] md:text-5xl">{site.about.principlesTitle}</h2>
          <div className="space-y-4">
            {site.about.principles.map((principle) => (
              <div key={principle.title} className="border border-[#d5dce3] bg-white/90 p-7 shadow-[0_18px_45px_rgba(36,53,72,0.05)]">
                <h3 className="font-serif text-2xl text-[#112033]">{principle.title}</h3>
                <p className="mt-3 text-sm leading-8 text-[#486071]">{principle.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function PartnersPage({ site }: { site: SiteContent }) {
  return (
    <>
      <section className="grid gap-10 border-b border-[#d5dce3] pb-16 pt-10 lg:grid-cols-[0.72fr_1.28fr] lg:pb-24">
        <div>
          <PublicSectionLabel>{site.partners.networkEyebrow}</PublicSectionLabel>
        </div>
        <div className="space-y-5">
          <h2 className="max-w-3xl font-serif text-4xl leading-tight text-[#112033] md:text-6xl">{site.partners.networkTitle}</h2>
          <p className="max-w-3xl text-lg leading-9 text-[#304556]">{site.partners.networkBody}</p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="grid gap-6 lg:grid-cols-3">
          {site.partners.partnerCards.map((partner) => (
            <a
              key={partner.name}
              className="group border border-[#d5dce3] bg-white/92 p-7 shadow-[0_18px_45px_rgba(36,53,72,0.05)] transition-transform hover:-translate-y-0.5"
              href={partner.href}
              target="_blank"
              rel="noreferrer"
            >
              <div className="flex items-center gap-3 text-[#35526c]">
                <Handshake className="h-4 w-4" />
                <span className="text-[11px] uppercase tracking-[0.24em]">{partner.role}</span>
              </div>
              <h3 className="mt-5 font-serif text-2xl text-[#112033]">{partner.name}</h3>
              <p className="mt-4 text-sm leading-8 text-[#486071]">{partner.body}</p>
              <div className="mt-6 inline-flex items-center text-sm font-medium text-[#24415d] transition-colors group-hover:text-[#8a6038]">
                <span>{partner.name}</span>
                <ChevronRight className="ml-1 h-4 w-4" />
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-10 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:py-24">
        <div>
          <PublicSectionLabel>{site.partners.impactEyebrow}</PublicSectionLabel>
        </div>
        <div className="space-y-8">
          <h2 className="max-w-3xl font-serif text-3xl leading-tight text-[#112033] md:text-5xl">{site.partners.impactTitle}</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {site.partners.impactCards.map((card) => (
              <PublicCard key={card.label} className="border border-[#d5dce3]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#6e7f8f]">{card.label}</p>
                <p className="mt-3 font-serif text-4xl text-[#112033]">{card.value}</p>
                <p className="mt-3 text-sm leading-8 text-[#486071]">{card.note}</p>
              </PublicCard>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ClosingSection(props: { locale: Locale; site: SiteContent; title: string; body: string }) {
  return (
    <section className="border border-[#d5dce3] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,241,246,0.94)_100%)] p-8 shadow-[0_28px_70px_rgba(36,53,72,0.09)] sm:p-10 lg:p-14">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div className="space-y-5">
          <PublicSectionLabel>Ciutatis</PublicSectionLabel>
          <h2 className="max-w-3xl font-serif text-3xl leading-tight text-[#112033] md:text-5xl">{props.title}</h2>
          <p className="max-w-3xl text-lg leading-9 text-[#304556]">{props.body}</p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <Button asChild className="w-full rounded-none border border-[#112033] bg-[#112033] px-6 py-6 text-xs uppercase tracking-[0.22em] text-white hover:bg-[#1d3045] lg:w-auto">
            <Link to="/auth">
              {props.site.common.openShell}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <a
            className="inline-flex w-full items-center justify-center rounded-none border border-[#9aa9b5] bg-white px-6 py-6 text-xs font-medium uppercase tracking-[0.22em] text-[#304556] transition-colors hover:border-[#304556] hover:text-[#112033] lg:w-auto"
            href="https://github.com/tebayoso/ciutatis"
            target="_blank"
            rel="noreferrer"
          >
            {props.site.common.readCode}
          </a>
        </div>
      </div>
    </section>
  );
}

function PublicNotFound({ locale, site }: { locale: Locale; site: SiteContent }) {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl border border-[#d5dce3] bg-white/94 p-10 text-center shadow-[0_24px_60px_rgba(36,53,72,0.06)]">
        <PublicSectionLabel>404</PublicSectionLabel>
        <h2 className="mt-4 font-serif text-4xl text-[#112033]">{site.common.pageNotFound}</h2>
        <p className="mt-4 text-lg leading-8 text-[#486071]">{site.common.pageNotFoundBody}</p>
        <div className="mt-8">
          <Button asChild className="rounded-none border border-[#112033] bg-[#112033] px-6 py-6 text-xs uppercase tracking-[0.22em] text-white hover:bg-[#1d3045]">
            <Link to={pathFor(locale, "home")}>{site.common.backHome}</Link>
          </Button>
        </div>
      </div>
    </section>
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

    const pageTitle = page?.title ?? `${site.meta.defaultTitle} — 404`;
    const pageDescription = page?.description ?? site.meta.defaultDescription;
    const currentKey = currentPage ?? "home";
    const origin = window.location.origin;
    const canonicalHref = origin + pathFor(locale, currentKey);
    const alternateLocale: Locale = locale === "en" ? "es" : "en";

    document.documentElement.lang = locale;
    document.title = pageTitle;
    upsertMetaByName("description", pageDescription);
    upsertMetaByName("theme-color", "#fcfbf7");
    upsertMetaByProperty("og:title", pageTitle);
    upsertMetaByProperty("og:description", pageDescription);
    upsertMetaByProperty("og:type", "website");
    upsertMetaByProperty("og:url", canonicalHref);
    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:title", pageTitle);
    upsertMetaByName("twitter:description", pageDescription);
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
    <div className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,#f3ede2_0%,#f6f4ef_28%,#eef3f8_100%)] text-[#112033] selection:bg-[#d0dceb]">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(53,82,108,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(53,82,108,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-35" />
      <div className="relative mx-auto max-w-7xl">
        <PublicPageHeader currentPage={currentPage ?? "home"} locale={locale} site={site} />

        <main className="px-5 pb-24 sm:px-8 lg:px-10 lg:pb-32">
          {currentPage === "home" && <HomePage locale={locale} site={site} />}
          {currentPage === "platform" && (
            <>
              <HeroIntro page={site.pages.platform} />
              <PlatformPage site={site} />
              <ClosingSection locale={locale} site={site} title={site.home.closeTitle} body={site.home.closeBody} />
            </>
          )}
          {currentPage === "about" && (
            <>
              <HeroIntro page={site.pages.about} />
              <AboutPage site={site} />
              <ClosingSection locale={locale} site={site} title={site.home.closeTitle} body={site.home.closeBody} />
            </>
          )}
          {currentPage === "partners" && (
            <>
              <HeroIntro page={site.pages.partners} />
              <PartnersPage site={site} />
              <ClosingSection locale={locale} site={site} title={site.home.closeTitle} body={site.home.closeBody} />
            </>
          )}
          {currentPage === null && <PublicNotFound locale={locale} site={site} />}
        </main>

        <footer className="border-t border-[#d5dce3] px-5 py-8 text-center text-[11px] uppercase tracking-[0.24em] text-[#6e7f8f] sm:px-8 lg:px-10">
          {site.footer}
        </footer>
      </div>
    </div>
  );
}

function HeroIntro({ page }: { page: SiteContent["pages"][PageKey] }) {
  return (
    <section className="grid gap-10 border-b border-[#d5dce3] pb-16 pt-10 lg:grid-cols-[0.72fr_1.28fr] lg:pb-24">
      <div>
        <PublicSectionLabel>{page.eyebrow}</PublicSectionLabel>
      </div>
      <div className="space-y-5">
        <h1 className="max-w-3xl font-serif text-4xl leading-tight text-[#112033] md:text-6xl">{page.heroTitle}</h1>
        <p className="max-w-3xl text-lg leading-9 text-[#304556]">{page.heroBody}</p>
      </div>
    </section>
  );
}
