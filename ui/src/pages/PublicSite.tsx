import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { ContactForm, type ContactFormCopy } from "@/components/ContactForm";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  FileCheck2,
  GitBranch,
  Landmark,
  MessageSquareText,
  ShieldCheck,
  Target,
  Waypoints,
  Workflow,
} from "lucide-react";

type Locale = "en" | "es";
type PageKey = "home" | "platform" | "about" | "partners";
type IconKey =
  | "government"
  | "routing"
  | "transparency"
  | "approvals"
  | "citizens"
  | "evidence"
  | "leadership"
  | "performance";

type HeroContent = {
  eyebrow: string;
  title: string;
  body: string;
};

type IconCard = {
  title: string;
  body: string;
  icon: IconKey;
};

type MetricCardContent = {
  label: string;
  value: string;
  note: string;
};

type FeedItem = {
  lane: string;
  title: string;
  body: string;
};

type Step = {
  label: string;
  title: string;
  body: string;
};

type FeatureLink = {
  page: PageKey;
  title: string;
  body: string;
};

type UseCaseCard = {
  title: string;
  role: string;
  body: string;
};

type SiteContent = {
  meta: {
    defaultTitle: string;
    defaultDescription: string;
  };
  nav: {
    mark: string;
    submark: string;
    languageLabel: string;
    github: string;
    signIn: string;
    links: Record<PageKey, string>;
  };
  common: {
    skipToContent: string;
    openShell: string;
    readCode: string;
    reportIssue: string;
    backHome: string;
    pageNotFound: string;
    pageNotFoundBody: string;
    xDefaultLabel: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    body: string;
    highlights: string[];
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
    chips: string[];
    board: {
      eyebrow: string;
      title: string;
      governmentLabel: string;
      governmentValue: string;
      goalLabel: string;
      goalValue: string;
      metrics: MetricCardContent[];
      attentionLabel: string;
      attentionItems: FeedItem[];
    };
    problem: {
      eyebrow: string;
      title: string;
      body: string;
      cards: IconCard[];
    };
    surfaces: {
      eyebrow: string;
      title: string;
      body: string;
      cards: IconCard[];
    };
    flow: {
      eyebrow: string;
      title: string;
      body: string;
      steps: Step[];
    };
    audience: {
      eyebrow: string;
      title: string;
      body: string;
      cards: IconCard[];
    };
    contrast: {
      eyebrow: string;
      title: string;
      points: string[];
    };
    featured: {
      eyebrow: string;
      title: string;
      cards: FeatureLink[];
    };
    close: {
      title: string;
      body: string;
    };
  };
  platform: {
    model: {
      eyebrow: string;
      title: string;
      body: string;
      cards: IconCard[];
    };
    visibility: {
      eyebrow: string;
      title: string;
      body: string;
      steps: Step[];
    };
    orchestration: {
      eyebrow: string;
      title: string;
      body: string;
      points: string[];
    };
    guardrails: {
      eyebrow: string;
      title: string;
      points: string[];
    };
  };
  about: {
    story: {
      eyebrow: string;
      title: string;
      body: string;
      cards: IconCard[];
    };
    principles: {
      eyebrow: string;
      title: string;
      body: string;
      points: string[];
    };
    boundaries: {
      eyebrow: string;
      title: string;
      points: string[];
    };
  };
  partners: {
    useCases: {
      eyebrow: string;
      title: string;
      body: string;
      cards: UseCaseCard[];
    };
    grounded: {
      eyebrow: string;
      title: string;
      cards: MetricCardContent[];
    };
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
    partners: "casos",
  },
};

const PAGE_SLUG_ALIASES: Partial<Record<Locale, Record<string, PageKey>>> = {
  es: {
    procesos: "platform",
    modulos: "about",
    alianzas: "partners",
  },
};

const OG_IMAGE_PATH = "/android-chrome-512x512.png";
const LIGHT_THEME_COLOR = "#f8f5ec";
const HERO_ATLAS_IMAGE_PATH = "/public-site/civic-atlas-daylight.jpg";
const TRANSPARENCY_INTERSTITIAL_IMAGE_PATH = "/public-site/transparency-ledger-evening.jpg";
const COMMITMENT_IMAGE_PATH = "/public-site/commitment-forum-sunrise.jpg";

type HomeSectionLink = {
  id: string;
  label: string;
};

const SITE: Record<Locale, SiteContent> = {
  en: {
    meta: {
      defaultTitle: "Ciutatis — Faster, clearer government operations",
      defaultDescription:
        "Ciutatis helps governments manage requests, approvals, forms, and public workflows faster, with fewer errors, better information, and real transparency for citizens.",
    },
    nav: {
      mark: "Ciutatis",
      submark: "Civic operating system for modern governments",
      languageLabel: "Language",
      github: "GitHub",
      signIn: "Enter the admin shell",
      links: {
        home: "Home",
        platform: "Platform",
        about: "Transparency",
        partners: "Citizen interface",
      },
    },
    common: {
      skipToContent: "Skip to content",
      openShell: "Enter the admin shell",
      readCode: "Read the code",
      reportIssue: "Report or ask",
      backHome: "Back home",
      pageNotFound: "Public page not found",
      pageNotFoundBody: "This route is not part of the current public site.",
      xDefaultLabel: "EN",
    },
    contact: {
      eyebrow: "Citizen reporting desk",
      title: "Report a civic issue or ask the proper office a clear question.",
      body:
        "Ciutatis starts with better intake. Citizens describe the case once, the right team gets the right context, and the request stays traceable from first message to final answer.",
      highlights: [
        "Structured reports and questions in one form",
        "Routed to the proper municipal team",
        "Tracked with status, ownership, and timestamps",
      ],
      form: {
        nameLabel: "Name",
        namePlaceholder: "Alex Rivera…",
        emailLabel: "Email",
        emailPlaceholder: "alex@example.com…",
        messageLabel: "Question or report",
        messagePlaceholder: "Tell us what happened, where it happened, and what answer you need…",
        submitIdle: "Send civic request",
        submitSubmitting: "Sending…",
        successTitle: "Thanks. Your request is now in the municipal queue.",
        successAction: "Send another message",
        errorMessage: "We couldn't submit your request. Please try again.",
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
        title: "Ciutatis — Faster, clearer government operations",
        description:
          "Manage citizen requests, approvals, and operational follow-through in one civic operating system built for speed, accuracy, and transparency.",
        hero: {
          eyebrow: "Civic operating system",
          title: "Governments move faster when requests, decisions, and evidence live in one place.",
          body:
            "Ciutatis helps governments route citizen requests, manage approvals, collect better information, and publish clearer follow-up with fewer errors and less operational drag.",
        },
      },
      platform: {
        title: "Platform — Ciutatis",
        description:
          "How Ciutatis keeps intake, routing, approvals, evidence, and public-service execution inside one accountable flow.",
        hero: {
          eyebrow: "Platform",
          title: "A government operating model built to reduce rework.",
          body:
            "Citizen intake, departmental routing, approvals, and service follow-through stay connected so the next step is obvious and the record stays intact.",
        },
      },
      about: {
        title: "Transparency — Ciutatis",
        description:
          "How Ciutatis turns operational clarity into public transparency without turning government into noise.",
        hero: {
          eyebrow: "Transparency",
          title: "Public trust grows when the system can explain itself.",
          body:
            "Ciutatis keeps status, ownership, approvals, and evidence attached to the same request so governments can answer with facts instead of fragments.",
        },
      },
      partners: {
        title: "Citizen Interface — Ciutatis",
        description:
          "How Ciutatis gives citizens a better way to report issues, ask clear questions, and follow the public process.",
        hero: {
          eyebrow: "Citizen interface",
          title: "Citizens should know where to report, where to ask, and what happens next.",
          body:
            "The public-facing side of Ciutatis makes government easier to approach and easier to follow without breaking the internal operating discipline teams need.",
        },
      },
    },
    home: {
      primaryCta: "See the operating model",
      secondaryCta: "Report or ask",
      chips: [
        "Faster municipal response",
        "Fewer routing errors",
        "Better operational information",
        "Transparent public follow-up",
      ],
      board: {
        eyebrow: "Municipal board",
        title: "See service operations before they turn into backlog.",
        governmentLabel: "Example government",
        governmentValue: "City of Astera",
        goalLabel: "Current service objective",
        goalValue:
          "Reduce response time across permits, maintenance, and citizen questions while keeping every decision traceable.",
        metrics: [
          {
            label: "Open citizen requests",
            value: "184",
            note: "Each request keeps status, owner, and evidence attached.",
          },
          {
            label: "Routing accuracy",
            value: "97.8%",
            note: "Better intake means fewer handoff mistakes between offices.",
          },
          {
            label: "Average first reply",
            value: "2.3 days",
            note: "Front-desk and department context stays shared from the start.",
          },
          {
            label: "Published decisions",
            value: "41",
            note: "Approvals and actions remain visible for later review.",
          },
        ],
        attentionLabel: "Needs action now",
        attentionItems: [
          {
            lane: "Public works",
            title: "Storm drain complaints are clustering",
            body: "Eight citizen reports were grouped into one field operation instead of scattered emails.",
          },
          {
            lane: "Permits",
            title: "Two high-impact approvals are waiting",
            body: "Sensitive permit decisions stay paused until the right reviewer signs off.",
          },
          {
            lane: "Citizen desk",
            title: "Incomplete address details were flagged",
            body: "The intake form caught missing location data before the case was misrouted.",
          },
        ],
      },
      problem: {
        eyebrow: "Why it works",
        title: "Government slows down when information breaks between desks.",
        body:
          "Most public-service workflows still jump between inboxes, PDFs, spreadsheets, and hallway knowledge. Ciutatis keeps the case intact so teams move faster with fewer avoidable mistakes.",
        cards: [
          {
            title: "Ask once, route correctly",
            body: "Guided intake collects the details teams need before the request leaves the citizen.",
            icon: "citizens",
          },
          {
            title: "Keep context with the case",
            body: "Notes, files, decisions, and status changes stay on the same request thread.",
            icon: "routing",
          },
          {
            title: "Make accountability visible",
            body: "Operators see who owns the next step, where delays appear, and what requires approval.",
            icon: "leadership",
          },
        ],
      },
      surfaces: {
        eyebrow: "What you manage",
        title: "One civic operating layer for requests, forms, and decisions.",
        body:
          "Ciutatis gives governments one surface for intake, routing, approvals, service status, and public follow-up so the right information is available at the right step.",
        cards: [
          {
            title: "Citizen intake",
            body: "Citizens report issues, ask questions, and submit structured forms without guessing the right office.",
            icon: "citizens",
          },
          {
            title: "Department routing",
            body: "Requests arrive with category, location, and contact context instead of being triaged from scratch.",
            icon: "routing",
          },
          {
            title: "Approval workflow",
            body: "Sensitive actions wait for the right reviewer and keep the decision record intact.",
            icon: "approvals",
          },
          {
            title: "Service board",
            body: "Leadership sees backlog, response time, and blocked flows before they turn into public frustration.",
            icon: "government",
          },
          {
            title: "Shared evidence",
            body: "Teams act with the same files, notes, and timestamps instead of recreating context by hand.",
            icon: "evidence",
          },
          {
            title: "Public transparency",
            body: "Citizens and auditors can follow what changed, when it changed, and who owns the next step.",
            icon: "transparency",
          },
        ],
      },
      flow: {
        eyebrow: "Operational loop",
        title: "One loop from citizen signal to municipal action.",
        body:
          "Ciutatis keeps intake, routing, action, and follow-up in one frame so governments can move quickly without losing oversight.",
        steps: [
          {
            label: "01",
            title: "Citizens report or ask",
            body: "The form captures the right category, location, and contact context from the start.",
          },
          {
            label: "02",
            title: "The system routes correctly",
            body: "Requests land in the proper office with enough information to act immediately.",
          },
          {
            label: "03",
            title: "Teams decide and act",
            body: "Notes, approvals, and updates stay attached to the case instead of leaking into side channels.",
          },
          {
            label: "04",
            title: "Citizens and leaders follow progress",
            body: "Everyone sees status, timestamps, and the next responsible step in clearer language.",
          },
        ],
      },
      audience: {
        eyebrow: "Who it serves",
        title: "For municipalities, agencies, and service teams that cannot run on guesswork.",
        body:
          "Ciutatis fits public teams that need cleaner handoffs, faster answers, fewer avoidable errors, and a public record that stays coherent under pressure.",
        cards: [
          {
            title: "Citizen service desks",
            body: "Collect better intake, answer with context, and stop bouncing residents between offices.",
            icon: "citizens",
          },
          {
            title: "Department managers",
            body: "See what is blocked, what is late, and where process quality needs intervention.",
            icon: "government",
          },
          {
            title: "Mayors, chiefs, and directors",
            body: "Read the system at a glance with service metrics, approvals, and clearer operational signals.",
            icon: "performance",
          },
        ],
      },
      contrast: {
        eyebrow: "Boundaries",
        title: "What Ciutatis refuses to do",
        points: [
          "It is not another inbox that loses context after the first handoff.",
          "It is not a black-box automation layer with no public record.",
          "It is not a generic portal with forms disconnected from internal execution.",
        ],
      },
      featured: {
        eyebrow: "Go deeper",
        title: "Follow the public workflow from three angles.",
        cards: [
          {
            page: "platform",
            title: "How governments work faster",
            body: "See how intake, routing, approvals, and follow-up reduce rework across the institution.",
          },
          {
            page: "about",
            title: "How transparency is built in",
            body: "See how status, evidence, and ownership remain readable for both operators and the public.",
          },
          {
            page: "partners",
            title: "How citizens interact clearly",
            body: "See how reporting, questions, and follow-up become easier to use and easier to trust.",
          },
        ],
      },
      close: {
        title: "Public service gets better when the system asks the right questions early.",
        body:
          "Ciutatis helps governments move faster with fewer errors, better information, and a clearer public record from first report to final answer.",
      },
    },
    platform: {
      model: {
        eyebrow: "Platform model",
        title: "Requests, approvals, and operational context belong to the same system.",
        body:
          "Ciutatis replaces fragmented desks and disconnected tools with one accountable flow for intake, routing, review, action, and follow-up.",
        cards: [
          {
            title: "Structured intake",
            body: "Citizens provide the details teams actually need, instead of opening a vague ticket.",
            icon: "citizens",
          },
          {
            title: "Department routing",
            body: "The case lands in the correct office with the right category, geography, and urgency.",
            icon: "routing",
          },
          {
            title: "Named ownership",
            body: "Every case has a visible next owner so the queue does not dissolve into shared ambiguity.",
            icon: "government",
          },
          {
            title: "Approval checkpoints",
            body: "High-impact actions pause for review without breaking the request timeline.",
            icon: "approvals",
          },
          {
            title: "Shared evidence",
            body: "Notes, files, and timestamps stay with the case so the team works from the same information.",
            icon: "evidence",
          },
          {
            title: "Operational signals",
            body: "Leaders see service times, blocked queues, and decisions that need attention before failure compounds.",
            icon: "performance",
          },
        ],
      },
      visibility: {
        eyebrow: "Readable by default",
        title: "Readable at the top, detailed underneath.",
        body:
          "Public service software should make the present state obvious first, then let teams drill into evidence, approvals, and case history only when needed.",
        steps: [
          {
            label: "A",
            title: "Leadership summary first",
            body: "See backlog, response time, bottlenecks, and pending approvals in one pass.",
          },
          {
            label: "B",
            title: "Case detail second",
            body: "Open the request, comments, documents, and status history that explain what changed.",
          },
          {
            label: "C",
            title: "Audit trail third",
            body: "Use timestamps, decisions, and reviewer history when a question needs proof instead of opinion.",
          },
        ],
      },
      orchestration: {
        eyebrow: "Operational gains",
        title: "Governments move faster when the next step is obvious.",
        body:
          "Most delays come from re-triage, repeated clarification, and approval ambiguity. Ciutatis removes those failure points by keeping each case legible throughout its life.",
        points: [
          "Intake forms ask for location, category, urgency, and contact once.",
          "The current owner and target department are explicit at every stage.",
          "Approvals interrupt risky actions before mistakes scale into public incidents.",
          "Updates flow back to citizens and operators from one shared case record.",
        ],
      },
      guardrails: {
        eyebrow: "Error reduction",
        title: "Fewer errors comes from enforced structure.",
        points: [
          "Required fields prevent incomplete requests from starting the wrong process.",
          "One active owner at a time keeps responsibility clear.",
          "Status changes and approvals are timestamped for later review.",
          "Shared context reduces duplicate data entry and contradictory answers.",
          "Every material change leaves an activity trace instead of disappearing into chat.",
        ],
      },
    },
    about: {
      story: {
        eyebrow: "Transparency by design",
        title: "Public trust grows when the system can explain itself.",
        body:
          "Transparency is not a PDF at the end of the month. It starts with clear intake, readable status, explicit ownership, and decisions that remain tied to evidence.",
        cards: [
          {
            title: "Visible current state",
            body: "Residents and teams can understand what stage a case is in without reading internal shorthand.",
            icon: "transparency",
          },
          {
            title: "Traceable decisions",
            body: "Approvals, exceptions, and changes stay attached to the case instead of hiding in inboxes.",
            icon: "evidence",
          },
          {
            title: "Readable public language",
            body: "The system is built to answer in plain operational terms instead of bureaucratic fragments.",
            icon: "citizens",
          },
        ],
      },
      principles: {
        eyebrow: "Principles",
        title: "Readable government needs readable software.",
        body:
          "These principles keep the platform credible for public operations, not just impressive in a demo.",
        points: [
          "Show the current state in plain language before showing system detail.",
          "Keep evidence, comments, and approvals attached to the same case.",
          "Separate citizen-facing simplicity from operator-facing governance without breaking continuity.",
          "Treat metrics as operational signals, not theatre for a dashboard screenshot.",
          "Prefer open-source, inspectable systems when public trust is on the line.",
          "Make escalation and human review explicit instead of pretending everything can be automated safely.",
        ],
      },
      boundaries: {
        eyebrow: "Boundaries",
        title: "Transparency does not mean chaos.",
        points: [
          "Not every detail must be public, but every decision path must remain accountable.",
          "Automation never removes human responsibility from sensitive actions.",
          "Citizen forms stay simple while internal review remains rigorous and traceable.",
        ],
      },
    },
    partners: {
      useCases: {
        eyebrow: "Citizen interaction",
        title: "Citizens should know where to report, where to ask, and what happens next.",
        body:
          "The public-facing side of Ciutatis reduces friction for residents while making the internal government response cleaner and easier to supervise.",
        cards: [
          {
            title: "Street issue reporting",
            role: "Public works and maintenance",
            body: "Citizens submit the location, problem type, and context once. Field teams receive a cleaner queue and clearer evidence.",
          },
          {
            title: "Questions and guidance",
            role: "Permits, benefits, and administrative services",
            body: "Residents ask the proper office a structured question instead of navigating a maze of disconnected pages.",
          },
          {
            title: "Follow-up and transparency",
            role: "Citizens, operators, and directors",
            body: "Everyone can see status changes, timestamps, and the next responsible step without restarting the conversation.",
          },
        ],
      },
      grounded: {
        eyebrow: "Grounded claims",
        title: "The gains are operational, not theatrical.",
        cards: [
          {
            label: "Request thread",
            value: "1 shared record",
            note: "Questions, evidence, ownership, and updates stay attached to the same case.",
          },
          {
            label: "Citizen intake",
            value: "Fewer wrong turns",
            note: "Better questions up front reduce redirections between desks.",
          },
          {
            label: "Public updates",
            value: "Clear timestamps",
            note: "Residents know what changed and when without chasing a new channel.",
          },
          {
            label: "Operational quality",
            value: "Better answers",
            note: "Departments respond with more context because they receive better information first.",
          },
        ],
      },
    },
    footer: "Open-source civic operating system for faster service and clearer transparency.",
  },
  es: {
    meta: {
      defaultTitle: "Ciutatis — Operacion publica mas rapida y mas clara",
      defaultDescription:
        "Ciutatis ayuda a gobiernos a gestionar pedidos, aprobaciones, formularios y seguimiento operativo mas rapido, con menos errores, mejor informacion y transparencia real para la ciudadania.",
    },
    nav: {
      mark: "Ciutatis",
      submark: "Sistema operativo civico para gobiernos modernos",
      languageLabel: "Idioma",
      github: "GitHub",
      signIn: "Entrar al shell administrativo",
      links: {
        home: "Inicio",
        platform: "Plataforma",
        about: "Transparencia",
        partners: "Interfaz ciudadana",
      },
    },
    common: {
      skipToContent: "Saltar al contenido",
      openShell: "Entrar al shell administrativo",
      readCode: "Ver el codigo",
      reportIssue: "Reportar o consultar",
      backHome: "Volver al inicio",
      pageNotFound: "Pagina publica no encontrada",
      pageNotFoundBody: "Esta ruta no forma parte del sitio publico actual.",
      xDefaultLabel: "EN",
    },
    contact: {
      eyebrow: "Mesa ciudadana",
      title: "Reporta un problema civico o haz una pregunta clara al area correcta.",
      body:
        "Ciutatis arranca con mejor intake. La ciudadania describe el caso una sola vez, el area correcta recibe el contexto correcto y el pedido se mantiene trazable desde el primer mensaje hasta la respuesta final.",
      highlights: [
        "Reportes y consultas en un mismo formulario",
        "Derivado al equipo municipal correcto",
        "Seguimiento con estado, responsable y marcas de tiempo",
      ],
      form: {
        nameLabel: "Nombre",
        namePlaceholder: "Ana Rivera…",
        emailLabel: "Email",
        emailPlaceholder: "ana@ejemplo.com…",
        messageLabel: "Consulta o reporte",
        messagePlaceholder: "Cuentanos que paso, donde paso y que respuesta necesitas…",
        submitIdle: "Enviar pedido civico",
        submitSubmitting: "Enviando…",
        successTitle: "Gracias. Tu pedido ya esta en la cola municipal.",
        successAction: "Enviar otro mensaje",
        errorMessage: "No pudimos enviar tu pedido. Intentalo de nuevo.",
        validation: {
          nameRequired: "El nombre es obligatorio",
          emailRequired: "El email es obligatorio",
          emailInvalid: "Ingresa un email valido",
          messageRequired: "El mensaje es obligatorio",
        },
      },
    },
    pages: {
      home: {
        title: "Ciutatis — Operacion publica mas rapida y mas clara",
        description:
          "Gestiona pedidos ciudadanos, aprobaciones y seguimiento operativo en un sistema civico pensado para velocidad, precision y transparencia.",
        hero: {
          eyebrow: "Sistema operativo civico",
          title: "Los gobiernos avanzan mas rapido cuando pedidos, decisiones y evidencia viven en un mismo lugar.",
          body:
            "Ciutatis ayuda a gobiernos a derivar pedidos ciudadanos, gestionar aprobaciones, reunir mejor informacion y publicar seguimiento mas claro con menos errores y menos friccion operativa.",
        },
      },
      platform: {
        title: "Plataforma — Ciutatis",
        description:
          "Como Ciutatis mantiene intake, derivacion, aprobaciones, evidencia y ejecucion publica dentro de un mismo flujo responsable.",
        hero: {
          eyebrow: "Plataforma",
          title: "Un modelo operativo de gobierno pensado para reducir retrabajo.",
          body:
            "El intake ciudadano, la derivacion interna, las aprobaciones y el seguimiento del servicio quedan conectados para que el proximo paso sea evidente y el registro se mantenga completo.",
        },
      },
      about: {
        title: "Transparencia — Ciutatis",
        description:
          "Como Ciutatis convierte claridad operativa en transparencia publica sin transformar la gestion en ruido.",
        hero: {
          eyebrow: "Transparencia",
          title: "La confianza publica crece cuando el sistema puede explicarse solo.",
          body:
            "Ciutatis mantiene estado, responsables, aprobaciones y evidencia unidos al mismo pedido para que los gobiernos respondan con hechos y no con fragmentos.",
        },
      },
      partners: {
        title: "Interfaz ciudadana — Ciutatis",
        description:
          "Como Ciutatis da a la ciudadania una mejor forma de reportar problemas, hacer preguntas claras y seguir el proceso publico.",
        hero: {
          eyebrow: "Interfaz ciudadana",
          title: "La ciudadania deberia saber donde reportar, donde consultar y que pasa despues.",
          body:
            "La capa publica de Ciutatis vuelve al gobierno mas facil de abordar y mas facil de seguir sin romper la disciplina operativa que los equipos necesitan por dentro.",
        },
      },
    },
    home: {
      primaryCta: "Ver el modelo operativo",
      secondaryCta: "Reportar o consultar",
      chips: [
        "Respuesta municipal mas rapida",
        "Menos errores de derivacion",
        "Mejor informacion operativa",
        "Seguimiento publico transparente",
      ],
      board: {
        eyebrow: "Tablero municipal",
        title: "Mira la operacion de servicio antes de que se vuelva atraso.",
        governmentLabel: "Gobierno de ejemplo",
        governmentValue: "Ciudad de Astera",
        goalLabel: "Objetivo actual de servicio",
        goalValue:
          "Bajar tiempos de respuesta en permisos, mantenimiento y consultas ciudadanas manteniendo cada decision trazable.",
        metrics: [
          {
            label: "Pedidos ciudadanos abiertos",
            value: "184",
            note: "Cada pedido mantiene estado, responsable y evidencia en el mismo lugar.",
          },
          {
            label: "Precision de derivacion",
            value: "97.8%",
            note: "Mejor intake significa menos errores de traspaso entre areas.",
          },
          {
            label: "Primera respuesta promedio",
            value: "2.3 dias",
            note: "Mesa de entrada y area de destino comparten contexto desde el arranque.",
          },
          {
            label: "Decisiones publicadas",
            value: "41",
            note: "Aprobaciones y acciones quedan visibles para revision posterior.",
          },
        ],
        attentionLabel: "Que requiere accion ahora",
        attentionItems: [
          {
            lane: "Obras publicas",
            title: "Se agrupan reclamos por pluviales",
            body: "Ocho reportes ciudadanos se consolidaron en una sola intervencion de campo en vez de emails dispersos.",
          },
          {
            lane: "Permisos",
            title: "Hay dos aprobaciones de alto impacto en espera",
            body: "Las decisiones sensibles quedan detenidas hasta que firme la persona correcta.",
          },
          {
            lane: "Mesa ciudadana",
            title: "Se detecto falta de direccion exacta",
            body: "El formulario marco datos de ubicacion incompletos antes de que el caso quedara mal derivado.",
          },
        ],
      },
      problem: {
        eyebrow: "Por que funciona",
        title: "El gobierno se frena cuando la informacion se rompe entre escritorios.",
        body:
          "Muchos flujos publicos todavia saltan entre inboxes, PDFs, planillas y memoria informal. Ciutatis mantiene el caso unido para que los equipos avancen mas rapido con menos errores evitables.",
        cards: [
          {
            title: "Preguntar una vez y derivar bien",
            body: "El intake guiado junta los datos que el equipo necesita antes de que el pedido salga de la ciudadania.",
            icon: "citizens",
          },
          {
            title: "Mantener el contexto con el caso",
            body: "Notas, archivos, decisiones y cambios de estado permanecen en el mismo hilo.",
            icon: "routing",
          },
          {
            title: "Hacer visible la responsabilidad",
            body: "Los operadores ven quien tiene el siguiente paso, donde aparece la demora y que necesita aprobacion.",
            icon: "leadership",
          },
        ],
      },
      surfaces: {
        eyebrow: "Que gestionas",
        title: "Una capa civica unica para pedidos, formularios y decisiones.",
        body:
          "Ciutatis da a los gobiernos una sola superficie para intake, derivacion, aprobaciones, estado del servicio y seguimiento publico, con la informacion correcta en la etapa correcta.",
        cards: [
          {
            title: "Intake ciudadano",
            body: "La ciudadania reporta problemas, hace consultas y completa formularios sin adivinar que oficina corresponde.",
            icon: "citizens",
          },
          {
            title: "Derivacion por area",
            body: "Los pedidos llegan con categoria, ubicacion y datos de contacto en vez de re-triage manual.",
            icon: "routing",
          },
          {
            title: "Flujo de aprobacion",
            body: "Las acciones sensibles esperan a la persona correcta y conservan el registro de la decision.",
            icon: "approvals",
          },
          {
            title: "Tablero de servicio",
            body: "La conduccion ve atrasos, tiempos de respuesta y cuellos de botella antes de que se conviertan en malestar publico.",
            icon: "government",
          },
          {
            title: "Evidencia compartida",
            body: "Los equipos actuan con los mismos archivos, notas y marcas de tiempo en vez de reconstruir contexto a mano.",
            icon: "evidence",
          },
          {
            title: "Transparencia publica",
            body: "La ciudadania y los auditores pueden seguir que cambio, cuando cambio y quien tiene el proximo paso.",
            icon: "transparency",
          },
        ],
      },
      flow: {
        eyebrow: "Loop operativo",
        title: "Un solo loop desde la senal ciudadana hasta la accion municipal.",
        body:
          "Ciutatis mantiene intake, derivacion, accion y seguimiento dentro del mismo marco para que el gobierno avance rapido sin perder control.",
        steps: [
          {
            label: "01",
            title: "La ciudadania reporta o consulta",
            body: "El formulario captura categoria, ubicacion y contacto desde el inicio.",
          },
          {
            label: "02",
            title: "El sistema deriva correctamente",
            body: "El pedido cae en el area adecuada con suficiente informacion para actuar.",
          },
          {
            label: "03",
            title: "El equipo decide y ejecuta",
            body: "Notas, aprobaciones y actualizaciones siguen unidas al caso en vez de perderse en canales laterales.",
          },
          {
            label: "04",
            title: "La ciudadania y la conduccion siguen el progreso",
            body: "Todos ven estado, marcas de tiempo y el proximo responsable en lenguaje claro.",
          },
        ],
      },
      audience: {
        eyebrow: "Para quien es",
        title: "Para municipios, agencias y equipos de servicio que no pueden operar a ciegas.",
        body:
          "Ciutatis encaja en equipos publicos que necesitan mejores traspasos, respuestas mas rapidas, menos errores evitables y un registro publico que se mantenga coherente bajo presion.",
        cards: [
          {
            title: "Mesas de atencion ciudadana",
            body: "Juntan mejor intake, responden con contexto y dejan de rebotar personas entre oficinas.",
            icon: "citizens",
          },
          {
            title: "Responsables de area",
            body: "Ven que esta bloqueado, que llega tarde y donde la calidad del proceso necesita intervencion.",
            icon: "government",
          },
          {
            title: "Intendencias, jefaturas y direcciones",
            body: "Leen el sistema de un vistazo con metricas de servicio, aprobaciones y mejores senales operativas.",
            icon: "performance",
          },
        ],
      },
      contrast: {
        eyebrow: "Limites",
        title: "Que se niega a hacer Ciutatis",
        points: [
          "No es otra bandeja de entrada que pierde contexto despues del primer traspaso.",
          "No es una capa de automatizacion opaca sin registro publico.",
          "No es un portal generico con formularios desconectados de la ejecucion interna.",
        ],
      },
      featured: {
        eyebrow: "Seguir leyendo",
        title: "Tres angulos para seguir el flujo publico.",
        cards: [
          {
            page: "platform",
            title: "Como un gobierno trabaja mas rapido",
            body: "Mira como intake, derivacion, aprobaciones y seguimiento reducen retrabajo dentro de la institucion.",
          },
          {
            page: "about",
            title: "Como se construye la transparencia",
            body: "Mira como estado, evidencia y responsabilidad siguen siendo legibles para operadores y ciudadania.",
          },
          {
            page: "partners",
            title: "Como interactua la ciudadania",
            body: "Mira como reportes, consultas y seguimiento se vuelven mas claros y mas confiables.",
          },
        ],
      },
      close: {
        title: "El servicio publico mejora cuando el sistema hace las preguntas correctas temprano.",
        body:
          "Ciutatis ayuda a gobiernos a avanzar mas rapido con menos errores, mejor informacion y un registro publico mas claro desde el primer reporte hasta la respuesta final.",
      },
    },
    platform: {
      model: {
        eyebrow: "Modelo de plataforma",
        title: "Pedidos, aprobaciones y contexto operativo pertenecen al mismo sistema.",
        body:
          "Ciutatis reemplaza escritorios fragmentados y herramientas desconectadas por un solo flujo responsable para intake, derivacion, revision, accion y seguimiento.",
        cards: [
          {
            title: "Intake estructurado",
            body: "La ciudadania aporta los datos que el equipo realmente necesita en vez de abrir un ticket vago.",
            icon: "citizens",
          },
          {
            title: "Derivacion por area",
            body: "El caso cae en la oficina correcta con categoria, geografia y urgencia.",
            icon: "routing",
          },
          {
            title: "Responsable visible",
            body: "Cada caso tiene un proximo dueno claro para que la cola no se diluya en responsabilidad compartida.",
            icon: "government",
          },
          {
            title: "Puntos de aprobacion",
            body: "Las acciones sensibles se detienen para revision sin romper la linea temporal del pedido.",
            icon: "approvals",
          },
          {
            title: "Evidencia compartida",
            body: "Notas, archivos y marcas de tiempo permanecen en el caso para que todos trabajen con la misma informacion.",
            icon: "evidence",
          },
          {
            title: "Senales operativas",
            body: "La conduccion ve tiempos de servicio, colas bloqueadas y decisiones que requieren atencion antes de que el problema escale.",
            icon: "performance",
          },
        ],
      },
      visibility: {
        eyebrow: "Legibilidad",
        title: "Claro arriba, detallado debajo.",
        body:
          "El software publico deberia mostrar primero el estado presente y luego dejar bajar a evidencia, aprobaciones e historial solo cuando haga falta.",
        steps: [
          {
            label: "A",
            title: "Primero el resumen de conduccion",
            body: "Mira atrasos, tiempos de respuesta, cuellos de botella y aprobaciones pendientes de un vistazo.",
          },
          {
            label: "B",
            title: "Despues el detalle del caso",
            body: "Abre el pedido, comentarios, documentos e historial de estados que explican que cambio.",
          },
          {
            label: "C",
            title: "Al final la trazabilidad",
            body: "Usa marcas de tiempo, decisiones e historial de revision cuando la pregunta requiera prueba y no opinion.",
          },
        ],
      },
      orchestration: {
        eyebrow: "Ganancias operativas",
        title: "Los gobiernos avanzan mas rapido cuando el proximo paso es obvio.",
        body:
          "La mayoria de las demoras aparecen por re-triage, aclaraciones repetidas y aprobaciones ambiguas. Ciutatis saca esos puntos de falla de la ruta principal.",
        points: [
          "Los formularios piden ubicacion, categoria, urgencia y contacto una sola vez.",
          "El responsable actual y el area de destino permanecen explicitos en cada etapa.",
          "Las aprobaciones interrumpen acciones riesgosas antes de que el error escale.",
          "Las actualizaciones vuelven a ciudadania y operadores desde un mismo expediente compartido.",
        ],
      },
      guardrails: {
        eyebrow: "Reduccion de errores",
        title: "Menos errores sale de la estructura, no del azar.",
        points: [
          "Los campos obligatorios evitan que pedidos incompletos disparen el proceso incorrecto.",
          "Un responsable activo a la vez mantiene clara la responsabilidad.",
          "Cambios de estado y aprobaciones quedan fechados para revision posterior.",
          "El contexto compartido reduce carga duplicada y respuestas contradictorias.",
          "Cada cambio relevante deja un rastro de actividad en vez de desaparecer en un chat.",
        ],
      },
    },
    about: {
      story: {
        eyebrow: "Transparencia desde el diseno",
        title: "La confianza publica crece cuando el sistema puede explicarse solo.",
        body:
          "La transparencia no es un PDF al final del mes. Empieza con intake claro, estado legible, responsabilidad explicita y decisiones unidas a evidencia.",
        cards: [
          {
            title: "Estado presente visible",
            body: "La ciudadania y el equipo pueden entender en que etapa esta un caso sin descifrar jerga interna.",
            icon: "transparency",
          },
          {
            title: "Decisiones trazables",
            body: "Aprobaciones, excepciones y cambios quedan unidos al expediente en vez de perderse en un inbox.",
            icon: "evidence",
          },
          {
            title: "Lenguaje publico legible",
            body: "El sistema esta hecho para responder en terminos claros y operativos, no en fragmentos burocraticos.",
            icon: "citizens",
          },
        ],
      },
      principles: {
        eyebrow: "Principios",
        title: "Gobierno legible necesita software legible.",
        body:
          "Estos principios mantienen a la plataforma creible para operaciones publicas, no solo atractiva en una demo.",
        points: [
          "Mostrar primero el estado actual en lenguaje claro antes que el detalle del sistema.",
          "Mantener evidencia, comentarios y aprobaciones unidos al mismo caso.",
          "Separar la simplicidad ciudadana de la gobernanza interna sin romper la continuidad del expediente.",
          "Tratar las metricas como senales operativas y no como teatro de dashboard.",
          "Preferir sistemas abiertos e inspeccionables cuando la confianza publica esta en juego.",
          "Hacer explicita la revision humana en vez de fingir que todo puede automatizarse con seguridad.",
        ],
      },
      boundaries: {
        eyebrow: "Limites",
        title: "Transparencia no significa caos.",
        points: [
          "No todo detalle tiene que ser publico, pero todo camino de decision debe ser responsable.",
          "La automatizacion nunca elimina la responsabilidad humana en acciones sensibles.",
          "Los formularios ciudadanos pueden ser simples mientras la revision interna sigue siendo rigurosa y trazable.",
        ],
      },
    },
    partners: {
      useCases: {
        eyebrow: "Interaccion ciudadana",
        title: "La ciudadania deberia saber donde reportar, donde consultar y que pasa despues.",
        body:
          "La cara publica de Ciutatis baja friccion para residentes y al mismo tiempo limpia la respuesta interna del gobierno.",
        cards: [
          {
            title: "Reportes urbanos",
            role: "Obras publicas y mantenimiento",
            body: "La ciudadania envia ubicacion, tipo de problema y contexto una sola vez. El equipo de campo recibe una cola mas limpia y mejor evidencia.",
          },
          {
            title: "Consultas y orientacion",
            role: "Permisos, beneficios y servicios administrativos",
            body: "Las personas preguntan al area correcta con un formato util en vez de navegar una red de paginas inconexas.",
          },
          {
            title: "Seguimiento y transparencia",
            role: "Ciudadania, operadores y direcciones",
            body: "Todos ven cambios de estado, marcas de tiempo y el proximo responsable sin reiniciar la conversacion.",
          },
        ],
      },
      grounded: {
        eyebrow: "Claims concretos",
        title: "La mejora es operativa, no teatral.",
        cards: [
          {
            label: "Expediente",
            value: "1 registro compartido",
            note: "Consultas, evidencia, responsabilidad y actualizaciones viven en el mismo caso.",
          },
          {
            label: "Ingreso ciudadano",
            value: "Menos vueltas",
            note: "Mejores preguntas al inicio reducen derivaciones entre escritorios.",
          },
          {
            label: "Actualizaciones publicas",
            value: "Tiempos claros",
            note: "La ciudadania sabe que cambio y cuando cambio sin perseguir otro canal.",
          },
          {
            label: "Calidad operativa",
            value: "Mejores respuestas",
            note: "Las areas responden con mas contexto porque reciben mejor informacion desde el inicio.",
          },
        ],
      },
    },
    footer: "Sistema operativo civico open source para mejor servicio y transparencia mas clara.",
  },
};

function resolveLocale(pathname: string): Locale {
  return pathname === "/es" || pathname.startsWith("/es/") ? "es" : "en";
}

function resolvePageKey(pathname: string, locale: Locale): PageKey | null {
  if (pathname === "/" || pathname === "/en" || pathname === "/es") {
    return "home";
  }
  if (pathname === "/platform" || pathname === "/en/platform" || pathname === "/es/plataforma" || pathname === "/es/procesos") {
    return "platform";
  }
  if (pathname === "/about" || pathname === "/en/about" || pathname === "/es/nosotros" || pathname === "/es/modulos") {
    return "about";
  }
  if (pathname === "/partners" || pathname === "/en/partners" || pathname === "/es/casos" || pathname === "/es/alianzas") {
    return "partners";
  }

  const segments = pathname.split("/").filter(Boolean);
  const slug = locale === "en" ? (segments[0] ?? "") : (segments[1] ?? "");
  if (slug === "") return "home";

  const match = Object.entries(PAGE_SLUGS[locale]).find(([, value]) => value === slug);
  const aliasMatch = PAGE_SLUG_ALIASES[locale]?.[slug];
  return (match?.[0] as PageKey | undefined) ?? aliasMatch ?? null;
}

function pathFor(locale: Locale, page: PageKey): string {
  const slug = PAGE_SLUGS[locale][page];
  return slug ? `/${locale}/${slug}` : `/${locale}`;
}

function portalPathFor(locale: Locale): string {
  return locale === "en" ? "/portal" : `/${locale}/portal`;
}

function buildHomeSectionLinks(site: SiteContent): HomeSectionLink[] {
  return [
    { id: "public-hero", label: site.pages.home.hero.eyebrow },
    { id: "public-problem", label: site.home.problem.eyebrow },
    { id: "public-surfaces", label: site.home.surfaces.eyebrow },
    { id: "public-audience", label: site.home.audience.eyebrow },
    { id: "public-contact", label: site.contact.eyebrow },
  ];
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

function iconForKey(icon: IconKey) {
  switch (icon) {
    case "government":
      return Landmark;
    case "routing":
      return Workflow;
    case "transparency":
      return Eye;
    case "approvals":
      return ShieldCheck;
    case "citizens":
      return MessageSquareText;
    case "evidence":
      return FileCheck2;
    case "leadership":
      return Waypoints;
    case "performance":
      return Target;
  }
}

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
      {children}
    </p>
  );
}

function SectionShell({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-32 border-b border-border/70 py-14 sm:scroll-mt-40 sm:py-16 lg:py-20", className)}>
      {children}
    </section>
  );
}

function ContentShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">{children}</div>;
}

function PublicCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("public-panel public-shadow rounded-[20px] p-6 sm:p-7", className)}>{children}</div>;
}

function SectionJumpRail({
  locale,
  activeSectionId,
  sections,
}: {
  locale: Locale;
  activeSectionId: string | null;
  sections: HomeSectionLink[];
}) {
  if (sections.length === 0) return null;

  return (
    <nav
      aria-label={locale === "en" ? "Page sections" : "Secciones de la pagina"}
      className="mt-4 flex gap-2 overflow-x-auto pb-1"
    >
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() =>
            document.getElementById(section.id)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
          className={cn(
            "whitespace-nowrap rounded-full border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors",
            activeSectionId === section.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/80 bg-background/85 text-muted-foreground hover:border-primary/50 hover:text-foreground",
          )}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}

function BulletList({ points }: { points: string[] }) {
  return (
    <div className="space-y-3">
      {points.map((point) => (
        <div key={point} className="flex items-start gap-3">
          <BadgeCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm leading-7 text-muted-foreground">{point}</p>
        </div>
      ))}
    </div>
  );
}

function IconCardGrid({ cards }: { cards: IconCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = iconForKey(card.icon);

        return (
          <PublicCard key={card.title} className="h-full">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-background text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{card.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
          </PublicCard>
        );
      })}
    </div>
  );
}

function PublicHeader({
  locale,
  currentPage,
  site,
  homeSections,
  activeSectionId,
}: {
  locale: Locale;
  currentPage: PageKey;
  site: SiteContent;
  homeSections: HomeSectionLink[];
  activeSectionId: string | null;
}) {
  const alternateLocale: Locale = locale === "en" ? "es" : "en";
  const isHome = currentPage === "home";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/86 backdrop-blur-xl">
      <ContentShell>
        <div className="py-4">
          <div className="public-panel public-shadow rounded-[26px] px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link className="group flex items-center gap-3 text-foreground focus-visible:rounded-[14px]" to={pathFor(locale, "home")}>
                <div className="flex size-11 items-center justify-center rounded-[14px] border border-border bg-background/90 text-primary transition-colors group-hover:border-primary/70">
                  <Landmark className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold tracking-tight" translate="no">
                    {site.nav.mark}
                  </div>
                  <div className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{site.nav.submark}</div>
                </div>
              </Link>

              <nav className="hidden items-center gap-1 rounded-[16px] border border-border bg-background/82 p-1 lg:flex">
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
                <a
                  className="hidden text-sm font-medium text-primary transition-colors hover:text-foreground focus-visible:rounded-[10px] lg:inline-flex"
                  href={portalPathFor(locale)}
                >
                  {site.common.reportIssue}
                </a>
                <div className="hidden items-center gap-2 rounded-[14px] border border-border bg-secondary/80 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
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
                      : "border-border bg-secondary/80 text-muted-foreground hover:bg-background hover:text-foreground",
                  )}
                >
                  {site.nav.links[page]}
                </Link>
              ))}
            </nav>

            {isHome ? (
              <div className="mt-4 border-t border-border/70 pt-4">
                <SectionJumpRail
                  locale={locale}
                  activeSectionId={activeSectionId}
                  sections={homeSections}
                />
              </div>
            ) : null}
          </div>
        </div>
      </ContentShell>
    </header>
  );
}

function HomeHero({ locale, site }: { locale: Locale; site: SiteContent }) {
  const hero = site.pages.home.hero;

  return (
    <SectionShell className="border-b-0 pt-8 sm:pt-10 lg:pt-14" id="public-hero">
      <ContentShell>
        <div className="public-panel public-shadow public-ornament relative overflow-hidden rounded-[32px] px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div aria-hidden="true" className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_24%,transparent),transparent_36%),radial-gradient(circle_at_bottom_left,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_34%)]" />
            <div className="absolute -right-10 top-0 hidden h-full w-[58%] overflow-hidden xl:block">
              <img
                src={HERO_ATLAS_IMAGE_PATH}
                alt=""
                className="h-full w-full object-cover object-center opacity-88"
                loading="eager"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--background)_96%,transparent)_0%,color-mix(in_oklab,var(--background)_88%,transparent)_22%,color-mix(in_oklab,var(--background)_24%,transparent)_100%)]" />
            </div>
            <div className="absolute -right-24 top-12 hidden size-72 rounded-full bg-accent/18 blur-3xl xl:block" />
          </div>

          <div className="relative grid gap-8 xl:grid-cols-[0.94fr_1.06fr] xl:items-start">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/88 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-sm">
                <Landmark className="size-3.5 text-primary" aria-hidden="true" />
                {hero.eyebrow}
              </div>
              <h1 className="public-display mt-6 max-w-5xl text-5xl leading-[0.9] text-foreground sm:text-6xl lg:text-[5.35rem]">
                {hero.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-[1.14rem] sm:leading-8">{hero.body}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full px-6">
                  <Link to={pathFor(locale, "platform")}>
                    {site.home.primaryCta}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-border bg-background/88 px-6">
                  <Link to={portalPathFor(locale)}>{site.home.secondaryCta}</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {site.home.chips.map((chip) => (
                  <div
                    key={chip}
                    className="rounded-full border border-border/80 bg-background/88 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-foreground/80"
                  >
                    {chip}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative xl:pl-8">
              <div className="public-panel public-shadow relative overflow-hidden rounded-[26px] border border-white/60 bg-background/74 p-5 backdrop-blur-xl sm:p-6">
                <div aria-hidden="true" className="absolute inset-0">
                  <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_16%,white_84%),transparent)]" />
                  <div className="absolute right-0 top-0 h-full w-full xl:w-[78%]">
                    <img
                      src={HERO_ATLAS_IMAGE_PATH}
                      alt=""
                      className="h-full w-full object-cover object-right-top opacity-20"
                      loading="eager"
                    />
                  </div>
                </div>

                <div className="relative">
                  <SectionEyebrow>{site.home.board.eyebrow}</SectionEyebrow>
                  <h2 className="public-display mt-4 max-w-2xl text-4xl leading-[0.96] text-foreground sm:text-5xl">
                    {site.home.board.title}
                  </h2>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-border/80 bg-background/92 p-5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        {site.home.board.governmentLabel}
                      </p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground" translate="no">
                        {site.home.board.governmentValue}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-border/80 bg-background/92 p-5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{site.home.board.goalLabel}</p>
                      <p className="mt-3 text-sm leading-7 text-foreground">{site.home.board.goalValue}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {site.home.board.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-[18px] border border-border/80 bg-background/88 p-5 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{metric.label}</p>
                        <p className="public-stat mt-3 text-3xl font-semibold tracking-tight text-foreground">{metric.value}</p>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{metric.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="public-panel-dark public-shadow relative mt-5 rounded-[24px] p-6 xl:-ml-10 xl:max-w-[92%]">
                <div className="mb-5 flex items-center gap-3">
                  <div className="public-dark-icon flex size-10 items-center justify-center rounded-[12px]">
                    <Eye className="size-4" aria-hidden="true" />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">
                    {site.home.board.attentionLabel}
                  </p>
                </div>
                <div className="space-y-4">
                  {site.home.board.attentionItems.map((item) => (
                    <article key={`${item.lane}-${item.title}`} className="rounded-[16px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-[999px] border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                          {item.lane}
                        </div>
                        <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/72">{item.body}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
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
        <div className="public-panel public-shadow relative overflow-hidden rounded-[28px] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_20%,transparent),transparent_38%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_34%)]" />
          <div className="relative grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-4">
              <SectionEyebrow>{page.hero.eyebrow}</SectionEyebrow>
            </div>
            <div className="lg:col-span-8">
              <h1 className="public-display max-w-4xl text-5xl leading-[0.94] text-foreground sm:text-6xl lg:text-[5rem]">{page.hero.title}</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">{page.hero.body}</p>
            </div>
          </div>
        </div>
      </ContentShell>
    </SectionShell>
  );
}

function HomePage({ locale, site, sourcePath }: { locale: Locale; site: SiteContent; sourcePath: string }) {
  return (
    <>
      <HomeHero locale={locale} site={site} />

      <SectionShell id="public-problem">
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <SectionEyebrow>{site.home.problem.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.home.problem.title}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{site.home.problem.body}</p>
            </div>
            <IconCardGrid cards={site.home.problem.cards} />
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell id="public-surfaces" className="bg-secondary/65">
        <ContentShell>
          <div className="grid gap-10">
            <div className="max-w-3xl">
              <SectionEyebrow>{site.home.surfaces.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.home.surfaces.title}</h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">{site.home.surfaces.body}</p>
            </div>
            <IconCardGrid cards={site.home.surfaces.cards} />
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell>
        <ContentShell>
          <div className="grid gap-8 xl:grid-cols-[0.88fr_1.12fr]">
            <div>
              <SectionEyebrow>{site.home.flow.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.home.flow.title}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{site.home.flow.body}</p>
            </div>
            <div className="space-y-4">
              {site.home.flow.steps.map((step) => (
                <article key={step.label} className="public-panel rounded-[18px] p-6 shadow-sm sm:grid sm:grid-cols-[76px_1fr] sm:gap-4">
                  <div className="text-sm font-semibold text-primary">{step.label}</div>
                  <div className="mt-4 sm:mt-0">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell id="public-audience" className="relative overflow-hidden bg-[var(--public-dark)] text-[var(--public-dark-foreground)]">
        <div aria-hidden="true" className="absolute inset-0">
          <img
            src={TRANSPARENCY_INTERSTITIAL_IMAGE_PATH}
            alt=""
            className="h-full w-full object-cover object-center opacity-34"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--public-dark)_94%,black_6%)_0%,color-mix(in_oklab,var(--public-dark)_88%,transparent)_40%,color-mix(in_oklab,var(--public-dark)_92%,black_8%)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_34%)]" />
        </div>
        <ContentShell>
          <div className="relative grid gap-8 xl:grid-cols-[1.04fr_0.96fr]">
            <div>
              <SectionEyebrow>{site.home.audience.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-4xl text-4xl leading-[0.98] sm:text-5xl">{site.home.audience.title}</h2>
              <p className="public-dark-muted mt-5 max-w-3xl text-lg leading-8">{site.home.audience.body}</p>
            </div>
            <div className="grid gap-4">
              {site.home.audience.cards.map((card) => {
                const Icon = iconForKey(card.icon);
                return (
                  <article key={card.title} className="public-panel-dark-soft rounded-[18px] p-6">
                    <div className="public-dark-icon flex size-11 items-center justify-center rounded-2xl">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-tight text-white">{card.title}</h3>
                    <p className="public-dark-muted mt-3 text-sm leading-7">{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell>
        <ContentShell>
          <div className="grid gap-8 xl:grid-cols-[0.94fr_1.06fr]">
            <div>
              <SectionEyebrow>{site.home.contrast.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.home.contrast.title}</h2>
            </div>
            <PublicCard className="space-y-3">
              <BulletList points={site.home.contrast.points} />
            </PublicCard>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell className="border-b-0">
        <ContentShell>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <PublicCard className="public-ornament relative overflow-hidden">
              <div className="relative">
                <SectionEyebrow>{site.home.featured.eyebrow}</SectionEyebrow>
                <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.home.featured.title}</h2>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{site.home.close.body}</p>
              </div>
            </PublicCard>

            <div className="grid gap-4">
              {site.home.featured.cards.map((card) => (
                <Link
                  key={card.page}
                  to={pathFor(locale, card.page)}
                  className="group public-panel public-shadow rounded-[20px] p-6 transition-colors hover:border-primary/60 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{site.nav.links[card.page]}</p>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    <span>{site.nav.links[card.page]}</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <ClosingSection locale={locale} site={site} sourcePath={sourcePath} title={site.home.close.title} body={site.home.close.body} />
    </>
  );
}

function PlatformPage({ site }: { site: SiteContent }) {
  return (
    <>
      <SectionShell>
        <ContentShell>
          <div className="grid gap-10">
            <div className="max-w-3xl">
              <SectionEyebrow>{site.platform.model.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.platform.model.title}</h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">{site.platform.model.body}</p>
            </div>
            <IconCardGrid cards={site.platform.model.cards} />
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell className="bg-secondary/65">
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr]">
            <div>
              <SectionEyebrow>{site.platform.visibility.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.platform.visibility.title}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{site.platform.visibility.body}</p>
            </div>
            <div className="space-y-4">
              {site.platform.visibility.steps.map((step) => (
                <article key={step.label} className="public-panel rounded-[18px] p-6 shadow-sm sm:grid sm:grid-cols-[76px_1fr] sm:gap-4">
                  <div className="text-sm font-semibold text-primary">{step.label}</div>
                  <div className="mt-4 sm:mt-0">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell>
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionEyebrow>{site.platform.orchestration.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.platform.orchestration.title}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{site.platform.orchestration.body}</p>
            </div>
            <PublicCard className="space-y-3">
              <BulletList points={site.platform.orchestration.points} />
            </PublicCard>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell className="border-b-0">
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionEyebrow>{site.platform.guardrails.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.platform.guardrails.title}</h2>
            </div>
            <PublicCard className="space-y-3">
              <BulletList points={site.platform.guardrails.points} />
            </PublicCard>
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
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <SectionEyebrow>{site.about.story.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.about.story.title}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{site.about.story.body}</p>
            </div>
            <IconCardGrid cards={site.about.story.cards} />
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell className="bg-secondary/65">
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionEyebrow>{site.about.principles.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.about.principles.title}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{site.about.principles.body}</p>
            </div>
            <PublicCard className="space-y-3">
              <BulletList points={site.about.principles.points} />
            </PublicCard>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell className="border-b-0">
        <ContentShell>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionEyebrow>{site.about.boundaries.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.about.boundaries.title}</h2>
            </div>
            <PublicCard className="space-y-3">
              <BulletList points={site.about.boundaries.points} />
            </PublicCard>
          </div>
        </ContentShell>
      </SectionShell>
    </>
  );
}

function UseCasesPage({ site }: { site: SiteContent }) {
  return (
    <>
      <SectionShell>
        <ContentShell>
          <div className="grid gap-10">
            <div className="max-w-3xl">
              <SectionEyebrow>{site.partners.useCases.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.partners.useCases.title}</h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">{site.partners.useCases.body}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {site.partners.useCases.cards.map((card) => (
                <PublicCard key={card.title} className="h-full">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <GitBranch className="size-4" aria-hidden="true" />
                    <span>{card.role}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
                </PublicCard>
              ))}
            </div>
          </div>
        </ContentShell>
      </SectionShell>

      <SectionShell className="border-b-0 bg-secondary/65">
        <ContentShell>
          <div className="grid gap-10">
            <div className="max-w-3xl">
              <SectionEyebrow>{site.partners.grounded.eyebrow}</SectionEyebrow>
              <h2 className="public-display mt-4 text-4xl leading-[0.98] text-foreground sm:text-5xl">{site.partners.grounded.title}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {site.partners.grounded.cards.map((card) => (
                <PublicCard key={card.label} className="h-full">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{card.label}</p>
                  <p className="public-stat mt-3 text-3xl font-semibold tracking-tight text-foreground">{card.value}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.note}</p>
                </PublicCard>
              ))}
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
    <SectionShell className="border-b-0 pt-10" id="public-contact">
      <ContentShell>
        <div className="public-panel public-shadow public-ornament relative overflow-hidden rounded-[28px] p-8 sm:p-10 lg:p-12">
          <div aria-hidden="true" className="absolute inset-0">
            <img
              src={COMMITMENT_IMAGE_PATH}
              alt=""
              className="h-full w-full object-cover object-center opacity-26"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--background)_94%,white_6%)_0%,color-mix(in_oklab,var(--background)_88%,transparent)_38%,color-mix(in_oklab,var(--background)_96%,white_4%)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_34%)]" />
          </div>
          <div className="relative grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="flex flex-col justify-between gap-8">
              <div>
                <SectionEyebrow>Ciutatis</SectionEyebrow>
                <h2 className="public-display mt-4 max-w-3xl text-4xl leading-[0.98] text-foreground sm:text-5xl">{title}</h2>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{body}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {site.contact.highlights.map((highlight) => (
                  <div key={highlight} className="rounded-[16px] border border-border bg-background/76 p-4 text-sm leading-6 text-foreground backdrop-blur-md">
                    {highlight}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="w-full rounded-full px-6 sm:w-auto">
                  <Link to="/auth">
                    {site.common.openShell}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full rounded-full border-border bg-background/88 px-6 sm:w-auto">
                  <a href="https://github.com/tebayoso/ciutatis" target="_blank" rel="noreferrer">
                    {site.common.readCode}
                  </a>
                </Button>
                <Button asChild size="lg" variant="ghost" className="w-full rounded-full sm:w-auto">
                  <Link to={pathFor(locale, "home")}>{site.common.backHome}</Link>
                </Button>
              </div>
            </div>
            <div className="public-panel-soft rounded-[20px] border border-white/65 bg-background/78 p-6 shadow-sm backdrop-blur-md sm:p-7">
              <SectionEyebrow>{site.contact.eyebrow}</SectionEyebrow>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{site.contact.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{site.contact.body}</p>
              <div className="mt-6">
                <ContactForm copy={site.contact.form} locale={locale} sourcePath={sourcePath} variant="publicSite" />
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
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{site.common.pageNotFound}</h2>
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

export function PublicSite() {
  const location = useLocation();
  const locale = useMemo(() => resolveLocale(location.pathname), [location.pathname]);
  const currentPage = useMemo(() => resolvePageKey(location.pathname, locale), [locale, location.pathname]);
  const site = SITE[locale];
  const page = currentPage ? site.pages[currentPage] : null;
  const homeSections = useMemo(
    () => (currentPage === "home" ? buildHomeSectionLinks(site) : []),
    [currentPage, site],
  );
  const { theme, setTheme } = useTheme();
  const previousThemeRef = useRef<typeof theme | null>(null);
  const previousLangRef = useRef<string | null>(null);
  const previousTitleRef = useRef<string | null>(null);
  const previousDescriptionRef = useRef<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    currentPage === "home" ? "public-hero" : null,
  );

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
    upsertMetaByName("theme-color", LIGHT_THEME_COLOR);
    upsertMetaByProperty("og:title", pageTitle);
    upsertMetaByProperty("og:description", pageDescription);
    upsertMetaByProperty("og:type", "website");
    upsertMetaByProperty("og:url", canonicalHref);
    upsertMetaByProperty("og:image", origin + OG_IMAGE_PATH);
    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:title", pageTitle);
    upsertMetaByName("twitter:description", pageDescription);
    upsertMetaByName("twitter:image", origin + OG_IMAGE_PATH);
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

  useEffect(() => {
    if (currentPage !== "home") {
      setActiveSectionId(null);
      return;
    }

    setActiveSectionId("public-hero");

    const root = document.querySelector(".public-site");
    const sections = homeSections
      .map((section) => document.getElementById(section.id))
      .filter((section): section is HTMLElement => !!section);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target instanceof HTMLElement) {
          setActiveSectionId(visible.target.id);
        }
      },
      {
        root: root instanceof Element ? root : null,
        threshold: [0.2, 0.45, 0.7],
        rootMargin: "-18% 0px -44% 0px",
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [currentPage, homeSections]);

  return (
    <div className="public-site h-[100dvh] w-full overflow-y-auto bg-background text-foreground" data-locale={locale}>
      <div className="relative min-h-full">
        <a
          href="#public-main"
          className="sr-only fixed left-4 top-4 z-50 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only"
        >
          {site.common.skipToContent}
        </a>

        <PublicHeader
          activeSectionId={activeSectionId}
          currentPage={currentPage ?? "home"}
          homeSections={homeSections}
          locale={locale}
          site={site}
        />

        <main id="public-main" className="pb-16 sm:pb-20 lg:pb-24">
          {currentPage === "home" && <HomePage locale={locale} site={site} sourcePath={location.pathname} />}
          {currentPage === "platform" && (
            <>
              <PageHero page={site.pages.platform} />
              <PlatformPage site={site} />
              <ClosingSection locale={locale} site={site} sourcePath={location.pathname} title={site.home.close.title} body={site.home.close.body} />
            </>
          )}
          {currentPage === "about" && (
            <>
              <PageHero page={site.pages.about} />
              <AboutPage site={site} />
              <ClosingSection locale={locale} site={site} sourcePath={location.pathname} title={site.home.close.title} body={site.home.close.body} />
            </>
          )}
          {currentPage === "partners" && (
            <>
              <PageHero page={site.pages.partners} />
              <UseCasesPage site={site} />
              <ClosingSection locale={locale} site={site} sourcePath={location.pathname} title={site.home.close.title} body={site.home.close.body} />
            </>
          )}
          {currentPage === null && <PublicNotFound locale={locale} site={site} />}
        </main>

        <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
          <ContentShell>
            <span translate="no">Ciutatis</span>
            {" · "}
            {site.footer}
          </ContentShell>
        </footer>
      </div>
    </div>
  );
}
