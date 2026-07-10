"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileSignature,
  FileText,
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
  UploadCloud,
  UserCircle,
  Users,
} from "lucide-react";
import GeoRegionRouter from "./geo/GeoEntityPage";
import {
  NAV_ROUTES,
  alternatePath,
  resolveRoute,
  routePath,
  type Locale,
  type PublicRoute,
  type RouteState,
} from "../lib/routes";
import {
  createPlaceFromOsm,
  fetchGeoByPath,
  searchExplorer,
  searchPublic,
  type ExplorerResults,
  type NominatimResult,
  type PublicSearchResult,
  type RegionSearchResult,
} from "../lib/public-search";
import { lookupOsmBoundary, markersFromRegionResults, regionResultMarkerId } from "../lib/geo";
import CivicMap from "./components/CivicMap";

const adminShellUrl = process.env.NEXT_PUBLIC_ADMIN_SHELL_URL ?? "https://admin.ciutatis.com";

const copy = {
  en: {
    nav: {
      govops: "GovOps",
      scrutiny: "Public Scrutiny",
      explore: "Explore",
      argentina: "Argentina",
      portal: "Public Portal",
      collaborate: "Collaborate",
      features: "Features",
      "how-it-works": "How it works",
      "for-governments": "For governments",
      "for-citizens": "For citizens",
      account: "Account",
      home: "Home",
      region: "",
      github: "GitHub",
      signIn: "Sign in",
      operatorSignIn: "Operator sign in",
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
      eyebrow: "Three public surfaces, one platform",
      title: "Explore the data, work with your government, or contribute documents.",
      subtitle:
        "Ciutatis keeps its public surfaces deliberately separate: a read-only data explorer for accountability, a portal where citizens act, and an open intake for contributing public documents.",
      explore: {
        tag: "Public Scrutiny",
        title: "Explore public data",
        body: "A read-only data explorer. Search institutions and places, inspect public requests, and follow institutional activity — no account needed.",
        cta: "Explore public data",
      },
      contribute: {
        tag: "Collaborate",
        title: "Contribute documents",
        body: "Drop a public government document. We recognise ones we already have and parse new ones into searchable, grounded data.",
        cta: "Contribute a document",
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
    explore: {
      eyebrow: "Civic map",
      title: "Explore cities and institutions on the map.",
      subtitle:
        "Search municipalities, places, and public institutions. See real administrative boundaries from OpenStreetMap, what's already on Ciutatis, and claim the places that aren't yet.",
      searchLabel: "Search the civic map",
      searchPlaceholder: "Search a city, municipality, or institution...",
      loading: "Searching...",
      empty: "No places or institutions found.",
      placesGroup: "Places",
      institutionsGroup: "Institutions",
      inCiutatis: "In Ciutatis",
      notInCiutatis: "Not yet in Ciutatis",
      claim: "Claim this place",
      creating: "Creating...",
      openPlace: "Open public site",
      openInstitution: "Open portal",
      mapHint: "Select a result to see its boundary on the map.",
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
      mapCta: "See places on the civic map",
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
    collaborate: {
      eyebrow: "Collaborate",
      title: "Help build the public record.",
      subtitle:
        "Drop a public government document — a budget, ordinance, contract, or report. We check whether it's already part of the public record, and parse new ones into searchable, grounded data.",
      steps: [
        { title: "Drop a document", body: "Upload a PDF, spreadsheet, or text file. Public documents only — nothing private or personal." },
        { title: "We check for duplicates", body: "An exact copy we already have is recognised instantly, so the same document isn't processed twice." },
        { title: "New documents get parsed", body: "We extract agencies, money, dates, and ordinances with source references, and flag anything similar to what we already hold." },
      ],
      dropTitle: "Drop your document here",
      dropBody: "or click to choose a file",
      dropHint: "PDF, CSV, XLSX, or text · up to 10 MB",
      choose: "Choose file",
      uploading: "Checking and processing…",
      bucketNote: "Contributions go to a shared public pool for review. Please only upload documents that are already public.",
      result: {
        duplicateTitle: "We already have this document",
        duplicateBody: "An identical copy is already part of the public record — no need to process it again. Here's what we have on file:",
        newTitle: "Thanks — we've added this document",
        newBody: "We parsed and processed your document. Here's what we extracted:",
        classificationLabel: "Classified as",
        extractionsLabel: "What we found",
        noExtractions: "No structured facts were extracted from this document.",
        possibleDuplicatesLabel: "Possibly related documents we already have",
        another: "Contribute another",
      },
      errors: {
        generic: "Something went wrong processing that file. Please try again.",
        unconfigured: "Document parsing isn't available just yet. Please check back soon.",
        rateLimited: "Too many uploads from this connection. Please try again in a few minutes.",
        tooLarge: "That file is too large. The maximum is 10 MB.",
        type: "Unsupported file type. Upload a PDF, spreadsheet, or text document.",
        empty: "That file looks empty. Pick another and try again.",
      },
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
        "Three public surfaces for citizens and watchdogs: explore public data, contribute documents, and act through the portal.",
      paths: [
        {
          tag: "Explore",
          title: "Public Scrutiny",
          body: "A read-only data explorer. Search public institutions and places and open their public surface — no account needed.",
          cta: "Explore public data",
          to: "scrutiny" as const,
        },
        {
          tag: "Contribute",
          title: "Collaborate",
          body: "Drop a public government document. We recognise ones we already have and parse new ones into searchable, grounded data.",
          cta: "Contribute a document",
          to: "collaborate" as const,
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
    account: {
      eyebrow: "Citizen account",
      title: "Track your requests and contributions.",
      subtitle:
        "A free citizen account lets you follow the public requests you submit and the documents you contribute. No operator role — just your own activity.",
      signInTab: "Sign in",
      signUpTab: "Create account",
      nameLabel: "Name",
      emailLabel: "Email",
      passwordLabel: "Password",
      signInCta: "Sign in",
      signUpCta: "Create account",
      loading: "Loading…",
      working: "Please wait…",
      greeting: "Signed in as",
      signOut: "Sign out",
      requestsTitle: "Your public requests",
      requestsEmpty: "No public requests yet. Requests you submit while signed in will appear here.",
      contributionsTitle: "Your contributions",
      contributionsEmpty: "No documents contributed yet.",
      contributeCta: "Contribute a document",
      statusDuplicate: "Already on file",
      statusIngested: "Added",
      operatorNote: "Run an institution? Operators sign in on the admin.",
      operatorCta: "Operator sign in",
      errors: {
        required: "Please fill in all fields.",
        weakPassword: "Password must be at least 8 characters.",
        invalid: "Invalid email or password.",
        exists: "An account with this email already exists.",
        generic: "Something went wrong. Please try again.",
      },
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
      explore: "Explorá",
      argentina: "Argentina",
      portal: "Portal Público",
      collaborate: "Colaborá",
      features: "Funcionalidades",
      "how-it-works": "Cómo funciona",
      "for-governments": "Para gobiernos",
      "for-citizens": "Para ciudadanos",
      account: "Cuenta",
      home: "Inicio",
      region: "",
      github: "GitHub",
      signIn: "Ingresar",
      operatorSignIn: "Ingreso de operadores",
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
      eyebrow: "Tres superficies públicas, una plataforma",
      title: "Explorá los datos, trabajá con tu gobierno o aportá documentos.",
      subtitle:
        "Ciutatis mantiene sus superficies públicas deliberadamente separadas: un explorador de datos de solo lectura para la rendición de cuentas, un portal donde la ciudadanía actúa, y una entrada abierta para aportar documentos públicos.",
      explore: {
        tag: "Escrutinio Público",
        title: "Explorá datos públicos",
        body: "Un explorador de datos de solo lectura. Buscá instituciones y lugares, inspeccioná pedidos públicos y seguí la actividad institucional — sin cuenta.",
        cta: "Explorar datos públicos",
      },
      contribute: {
        tag: "Colaborá",
        title: "Aportá documentos",
        body: "Subí un documento público del gobierno. Reconocemos los que ya tenemos y analizamos los nuevos en datos buscables y verificables.",
        cta: "Aportar un documento",
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
    explore: {
      eyebrow: "Mapa cívico",
      title: "Explorá ciudades e instituciones en el mapa.",
      subtitle:
        "Buscá municipios, lugares e instituciones públicas. Mirá límites administrativos reales de OpenStreetMap, qué ya está en Ciutatis y reclamá los lugares que todavía faltan.",
      searchLabel: "Buscar en el mapa cívico",
      searchPlaceholder: "Buscá una ciudad, municipio o institución...",
      loading: "Buscando...",
      empty: "No se encontraron lugares o instituciones.",
      placesGroup: "Lugares",
      institutionsGroup: "Instituciones",
      inCiutatis: "En Ciutatis",
      notInCiutatis: "Aún no en Ciutatis",
      claim: "Reclamar este lugar",
      creating: "Creando...",
      openPlace: "Abrir sitio público",
      openInstitution: "Abrir portal",
      mapHint: "Elegí un resultado para ver su límite en el mapa.",
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
      mapCta: "Ver lugares en el mapa cívico",
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
    collaborate: {
      eyebrow: "Colaborá",
      title: "Ayudá a construir el registro público.",
      subtitle:
        "Subí un documento público del gobierno — un presupuesto, ordenanza, contrato o informe. Verificamos si ya forma parte del registro público y analizamos los nuevos en datos buscables y verificables.",
      steps: [
        { title: "Subí un documento", body: "Cargá un PDF, planilla o archivo de texto. Solo documentos públicos — nada privado ni personal." },
        { title: "Verificamos duplicados", body: "Si ya tenemos una copia idéntica, se reconoce al instante y no se procesa dos veces." },
        { title: "Los nuevos se analizan", body: "Extraemos organismos, montos, fechas y ordenanzas con referencias a la fuente, y marcamos lo que se parece a lo que ya tenemos." },
      ],
      dropTitle: "Soltá tu documento acá",
      dropBody: "o hacé clic para elegir un archivo",
      dropHint: "PDF, CSV, XLSX o texto · hasta 10 MB",
      choose: "Elegir archivo",
      uploading: "Verificando y procesando…",
      bucketNote: "Las contribuciones van a un fondo público compartido para revisión. Subí solo documentos que ya sean públicos.",
      result: {
        duplicateTitle: "Ya tenemos este documento",
        duplicateBody: "Ya existe una copia idéntica en el registro público — no hace falta procesarlo de nuevo. Esto es lo que tenemos:",
        newTitle: "¡Gracias! Agregamos este documento",
        newBody: "Analizamos y procesamos tu documento. Esto es lo que extrajimos:",
        classificationLabel: "Clasificado como",
        extractionsLabel: "Qué encontramos",
        noExtractions: "No se extrajeron datos estructurados de este documento.",
        possibleDuplicatesLabel: "Documentos posiblemente relacionados que ya tenemos",
        another: "Aportar otro",
      },
      errors: {
        generic: "Algo salió mal al procesar el archivo. Probá de nuevo.",
        unconfigured: "El análisis de documentos todavía no está disponible. Volvé pronto.",
        rateLimited: "Demasiadas subidas desde esta conexión. Probá de nuevo en unos minutos.",
        tooLarge: "El archivo es demasiado grande. El máximo es 10 MB.",
        type: "Tipo de archivo no admitido. Subí un PDF, planilla o documento de texto.",
        empty: "El archivo parece vacío. Elegí otro e intentá de nuevo.",
      },
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
        "Tres superficies públicas para ciudadanía y observadores: explorar datos públicos, aportar documentos, y actuar a través del portal.",
      paths: [
        {
          tag: "Explorar",
          title: "Escrutinio Público",
          body: "Un explorador de datos de solo lectura. Buscá instituciones y lugares públicos y abrí su superficie pública — sin cuenta.",
          cta: "Explorar datos públicos",
          to: "scrutiny" as const,
        },
        {
          tag: "Aportar",
          title: "Colaborá",
          body: "Subí un documento público del gobierno. Reconocemos los que ya tenemos y analizamos los nuevos en datos buscables y verificables.",
          cta: "Aportar un documento",
          to: "collaborate" as const,
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
    account: {
      eyebrow: "Cuenta ciudadana",
      title: "Seguí tus pedidos y aportes.",
      subtitle:
        "Una cuenta ciudadana gratuita te deja seguir los pedidos públicos que enviás y los documentos que aportás. Sin rol de operador — solo tu actividad.",
      signInTab: "Ingresar",
      signUpTab: "Crear cuenta",
      nameLabel: "Nombre",
      emailLabel: "Email",
      passwordLabel: "Contraseña",
      signInCta: "Ingresar",
      signUpCta: "Crear cuenta",
      loading: "Cargando…",
      working: "Esperá un momento…",
      greeting: "Sesión iniciada como",
      signOut: "Cerrar sesión",
      requestsTitle: "Tus pedidos públicos",
      requestsEmpty: "Todavía no enviaste pedidos públicos. Los que envíes con sesión iniciada aparecerán acá.",
      contributionsTitle: "Tus aportes",
      contributionsEmpty: "Todavía no aportaste documentos.",
      contributeCta: "Aportar un documento",
      statusDuplicate: "Ya registrado",
      statusIngested: "Agregado",
      operatorNote: "¿Operás una institución? Los operadores ingresan en el admin.",
      operatorCta: "Ingreso de operadores",
      errors: {
        required: "Completá todos los campos.",
        weakPassword: "La contraseña debe tener al menos 8 caracteres.",
        invalid: "Email o contraseña inválidos.",
        exists: "Ya existe una cuenta con este email.",
        generic: "Algo salió mal. Probá de nuevo.",
      },
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
        {route === "explore" ? <ExplorePage locale={locale} /> : null}
        {route === "portal" ? <PortalPage locale={locale} /> : null}
        {route === "collaborate" ? <CollaboratePage locale={locale} /> : null}
        {route === "features" ? <FeaturesPage locale={locale} /> : null}
        {route === "how-it-works" ? <HowItWorksPage locale={locale} /> : null}
        {route === "for-governments" ? <ForGovernmentsPage locale={locale} /> : null}
        {route === "for-citizens" ? <ForCitizensPage locale={locale} /> : null}
        {route === "account" ? <AccountPage locale={locale} /> : null}
        {route === "region" && regionPath ? <GeoRegionRouter locale={locale} pathPrefix={regionPath} /> : null}
        {route === "argentina" ? <GeoRegionRouter locale={locale} pathPrefix="/ar" /> : null}
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
        <a className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink)] transition-colors hover:text-[var(--accent)]" href={routePath(locale, "account")}>
          <UserCircle className="h-4 w-4" />
          {t.nav.account}
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
          <a href={routePath(locale, "account")} className="transition-colors hover:text-[var(--ink)]">
            {t.nav.account}
          </a>
          <a href={`${adminShellUrl}/admin/auth`} className="transition-colors hover:text-[var(--ink)]">
            {t.nav.operatorSignIn}
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
      <div className="grid gap-6 lg:grid-cols-3">
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
            <UploadCloud className="h-4 w-4" /> {t.contribute.tag}
          </p>
          <h3 className="text-2xl font-medium text-[var(--ink)] font-serif">{t.contribute.title}</h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted-strong)]">{t.contribute.body}</p>
          <a className="hero-button mt-6 w-fit" href={routePath(locale, "collaborate")}>
            {t.contribute.cta}
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

function resultName(result: RegionSearchResult): string {
  if (result.kind === "place") return result.place.name;
  if (result.kind === "geo") return result.entity.name;
  return result.result.display_name.split(",")[0]?.trim() ?? result.result.display_name;
}

function ExplorePage({ locale }: { locale: Locale }) {
  const t = copy[locale].explore;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExplorerResults>({ institutions: [], places: [] });
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [boundary, setBoundary] = useState<unknown | null>(null);
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  // When set, the next search result auto-selects its best match — used when
  // arriving via ?q= (breadcrumbs, shared links) so the boundary draws
  // without an extra click. Typing never sets it.
  const autoSelectRef = useRef(false);

  // Shareable searches: seed the query from /explore?q=... on mount, and keep
  // the URL in sync as the query changes (replaceState — no history spam).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      autoSelectRef.current = true;
      setQuery(q);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set("q", query.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, [query]);

  // Debounced search; an empty query loads the default Ciutatis listing.
  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const next = await searchExplorer(query);
        if (!cancelled) {
          setResults(next);
          const autoSelect = autoSelectRef.current;
          autoSelectRef.current = false;
          if (autoSelect && next.places.length > 0) {
            // Rank: Ciutatis places beat raw OSM rows (they carry the "open
            // place" affordance), exact name match beats containment
            // ("Provincia de Buenos Aires" → OSM's "Buenos Aires").
            const normalized = query.trim().toLowerCase();
            const exact = (r: RegionSearchResult) => resultName(r).toLowerCase() === normalized;
            const contains = (r: RegionSearchResult) => {
              const name = resultName(r).toLowerCase();
              return normalized.includes(name) || name.includes(normalized);
            };
            const best =
              next.places.find((r) => r.kind === "place" && exact(r)) ??
              next.places.find((r) => r.kind === "place" && contains(r)) ??
              next.places.find(exact) ??
              next.places.find(contains) ??
              next.places[0];
            void selectPlaceResult(best);
          } else {
            setSelectedId(null);
            selectedIdRef.current = null;
            setBoundary(null);
          }
        }
      } catch {
        if (!cancelled) setResults({ institutions: [], places: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  const markers = useMemo(() => markersFromRegionResults(results.places), [results.places]);

  const selectedResult = useMemo(
    () => results.places.find((r) => regionResultMarkerId(r) === selectedId) ?? null,
    [results.places, selectedId]
  );

  // Parent admin entities of the selected result, outermost first. Each is a
  // breadcrumb that re-queries the explorer and auto-selects the parent, so
  // users can walk up the hierarchy (city → province → country) on the map.
  const parentTrail = useMemo(() => {
    if (!selectedResult) return [];
    if (selectedResult.kind === "place") {
      const p = selectedResult.place;
      return [p.countryName ?? p.countryCode.toUpperCase(), p.parentSubdivisionName].filter(
        (v): v is string => Boolean(v)
      );
    }
    if (selectedResult.kind === "geo") {
      const e = selectedResult.entity;
      const own = e.name.toLowerCase();
      const chain: (string | null)[] = e.level === "provincia" ? ["Argentina"] : ["Argentina", e.provinceName];
      if (e.parentName && e.parentName !== e.provinceName) chain.push(e.parentName);
      return chain.filter((v): v is string => Boolean(v) && v!.toLowerCase() !== own);
    }
    const addr = selectedResult.result.address;
    const own = resultName(selectedResult).toLowerCase();
    return [addr?.country, addr?.state, addr?.state_district ?? addr?.county].filter(
      (v): v is string => Boolean(v) && v!.toLowerCase() !== own
    );
  }, [selectedResult]);

  function goToParent(name: string) {
    autoSelectRef.current = true;
    setQuery(name);
  }

  async function selectPlaceResult(result: RegionSearchResult) {
    const id = regionResultMarkerId(result);
    setSelectedId(id);
    selectedIdRef.current = id;
    let osm: { type: string; id: string | number } | null = null;
    if (result.kind === "nominatim") {
      osm = { type: result.result.osm_type, id: result.result.osm_id };
    } else if (result.kind === "place") {
      osm = result.place.osmType && result.place.osmId ? { type: result.place.osmType, id: result.place.osmId } : null;
    } else if (result.entity.osmType && result.entity.osmId) {
      osm = { type: result.entity.osmType, id: result.entity.osmId };
    } else {
      // Geo entity without an OSM anchor yet: the detail endpoint backfills it
      // server-side (one cached Nominatim search) and returns the ids.
      const detail = await fetchGeoByPath(result.entity.pathPrefix);
      if (selectedIdRef.current !== id) return;
      osm = detail?.osmType && detail?.osmId ? { type: detail.osmType, id: detail.osmId } : null;
    }
    if (!osm) {
      setBoundary(null);
      return;
    }
    const lookup = await lookupOsmBoundary(osm.type, osm.id);
    // Ignore stale lookups if the selection moved on.
    if (selectedIdRef.current === id) setBoundary(lookup?.geojson ?? null);
  }

  function selectByMarkerId(id: string) {
    const result = results.places.find((r) => regionResultMarkerId(r) === id);
    if (result) void selectPlaceResult(result);
  }

  // Keyboard navigation from the search input: ↑/↓ walk the place results
  // (the map follows), Enter opens the selected Ciutatis place.
  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.places.length === 0) return;
      const ids = results.places.map(regionResultMarkerId);
      const currentIndex = selectedId ? ids.indexOf(selectedId) : -1;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.min(Math.max(currentIndex + delta, 0), ids.length - 1);
      void selectPlaceResult(results.places[nextIndex]);
    } else if (event.key === "Enter") {
      const selected = results.places.find((r) => regionResultMarkerId(r) === selectedId);
      if (selected?.kind === "place") window.location.href = selected.place.url;
      else if (selected?.kind === "geo") window.location.href = selected.entity.pathPrefix;
    }
  }

  async function claimPlace(result: NominatimResult) {
    const key = `${result.osm_type}-${result.osm_id}`;
    setCreatingKey(key);
    setClaimError(null);
    const outcome = await createPlaceFromOsm(result);
    setCreatingKey(null);
    if (outcome.ok) {
      window.location.href = outcome.place.url;
      return;
    }
    setClaimError(outcome.error);
  }

  const hasResults = results.places.length > 0 || results.institutions.length > 0;

  return (
    <section className="space-y-12">
      <Hero eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} icon={<MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      {/* Mobile flow: search → map → results. On lg the map moves to a sticky
          right column spanning both left-column cards. Base grid-cols-1 keeps
          the implicit column from stretching to intrinsic content width. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        <div className="rounded-2xl border border-[var(--border)] bg-white/80 p-5 shadow-sm sm:p-6 lg:col-start-1 lg:row-start-1">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]" htmlFor="explore-search">
            {t.searchLabel}
          </label>
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              id="explore-search"
              className="w-full rounded border border-[var(--border-strong)] bg-white py-3 pl-11 pr-4 text-base outline-none transition focus:border-[var(--accent)]"
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          {loading ? <p className="mt-4 text-sm text-[var(--muted-strong)]">{t.loading}</p> : null}
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-6">
          {selectedResult && parentTrail.length > 0 ? (
            <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
              {parentTrail.map((name) => (
                <span key={name} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => goToParent(name)}
                    className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 font-medium text-[var(--muted-strong)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink)]"
                  >
                    {name}
                  </button>
                  <ChevronRight className="h-3 w-3 text-[var(--muted)]" />
                </span>
              ))}
              <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)]/60 px-3 py-1 font-semibold text-[var(--ink)]">
                {resultName(selectedResult)}
              </span>
            </nav>
          ) : null}
          <CivicMap className="h-[45vh] min-h-[340px] lg:h-[640px]" markers={markers} boundary={boundary} selectedId={selectedId} onSelect={selectByMarkerId} />
          <p className="mt-3 text-center text-xs text-[var(--muted-strong)]">{t.mapHint}</p>
        </div>

        {hasResults || claimError || !loading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/80 p-5 shadow-sm sm:p-6 lg:col-start-1 lg:row-start-2">
          {!loading && !hasResults ? <p className="text-sm text-[var(--muted-strong)]">{t.empty}</p> : null}
          {claimError ? (
            <p className="flex items-center gap-2 text-sm text-[var(--red)]">
              <AlertCircle className="h-4 w-4" />
              {claimError}
            </p>
          ) : null}

          {results.places.length > 0 ? (
            <div className="mt-6 first:mt-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />
                {t.placesGroup}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {results.places.map((result) => {
                  const id = regionResultMarkerId(result);
                  const selected = id === selectedId;
                  const name = resultName(result);
                  const inCiutatis = result.kind === "place" || (result.kind === "geo" && result.entity.claimed);
                  const subtitle =
                    result.kind === "place"
                      ? [result.place.jurisdictionLabel, result.place.parentSubdivisionName, result.place.countryName ?? result.place.countryCode.toUpperCase()].filter(Boolean).join(" · ")
                      : result.kind === "geo"
                        ? [...new Set([result.entity.parentName, result.entity.provinceName, "Argentina"].filter((v) => v && v !== result.entity.name))].join(" · ")
                        : result.result.display_name;
                  const badge =
                    result.kind === "geo" && !result.entity.claimed
                      ? result.entity.jurisdictionType
                      : inCiutatis
                        ? t.inCiutatis
                        : t.notInCiutatis;
                  const openHref =
                    result.kind === "place" ? result.place.url : result.kind === "geo" ? result.entity.pathPrefix : null;
                  const creating = result.kind === "nominatim" && creatingKey === `${result.result.osm_type}-${result.result.osm_id}`;
                  return (
                    <div
                      key={id}
                      className={`rounded-xl border p-3 transition ${selected ? "border-[var(--accent)] bg-[var(--accent-soft)]/40" : "border-[var(--border)] bg-[var(--panel)] hover:-translate-y-0.5 hover:shadow-sm"}`}
                    >
                      <button type="button" className="w-full text-left" onClick={() => void selectPlaceResult(result)}>
                        <span className="flex items-center gap-2">
                          {inCiutatis ? <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" /> : <Globe2 className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />}
                          <span className="min-w-0 truncate font-medium text-[var(--ink)]">{name}</span>
                          <span
                            className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${inCiutatis ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "border border-[var(--border-strong)] bg-white text-[var(--muted-strong)]"}`}
                          >
                            {badge}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-[var(--muted-strong)]">{subtitle}</span>
                      </button>
                      {selected ? (
                        <div className="mt-2 flex items-center justify-end gap-3 border-t border-[var(--border)] pt-2">
                          {openHref ? (
                            <a href={openHref} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                              {t.openPlace}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </a>
                          ) : result.kind === "nominatim" ? (
                            <button
                              type="button"
                              onClick={() => void claimPlace(result.result)}
                              disabled={creating}
                              className="inline-flex items-center gap-1.5 rounded bg-[var(--ink)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:opacity-90 disabled:opacity-50"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              {creating ? t.creating : t.claim}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {results.institutions.length > 0 ? (
            <div className="mt-6 first:mt-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                <Landmark className="h-3.5 w-3.5 text-[var(--accent)]" />
                {t.institutionsGroup}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {results.institutions.map((institution) => (
                  <a
                    key={institution.id}
                    href={`/portal/${institution.slug}`}
                    className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Landmark className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                      <span className="min-w-0 truncate font-medium text-[var(--ink)]">{institution.name}</span>
                      <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{institution.issuePrefix}</span>
                    </span>
                    {institution.description ? (
                      <span className="mt-1 block truncate text-xs text-[var(--muted-strong)]">{institution.description}</span>
                    ) : null}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        ) : null}
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

type CollaborateExtraction = { type: string; text: string; attributes?: Record<string, unknown> };
type CollaborateDocument = {
  id: string;
  title: string;
  classification?: { label: string; confidence: number } | null;
  extractions?: CollaborateExtraction[];
};
type CollaboratePossibleDuplicate = { documentId: string; title: string; score: number };
type CollaborateResult = {
  status: "duplicate" | "ingested" | "failed";
  contentHash?: string;
  document?: CollaborateDocument | null;
  possibleDuplicates?: CollaboratePossibleDuplicate[];
  error?: string;
};

const COLLABORATE_MAX_BYTES = 10 * 1024 * 1024;

function CollaboratePage({ locale }: { locale: Locale }) {
  const t = copy[locale].collaborate;
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CollaborateResult | null>(null);

  async function upload(file: File) {
    setError(null);
    setResult(null);
    if (file.size === 0) {
      setError(t.errors.empty);
      return;
    }
    if (file.size > COLLABORATE_MAX_BYTES) {
      setError(t.errors.tooLarge);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const response = await fetch("/api/public/collaborate", { method: "POST", body: form });
      const payload = (await response.json().catch(() => null)) as (CollaborateResult & { error?: string }) | null;
      if (!response.ok) {
        if (response.status === 503) setError(t.errors.unconfigured);
        else if (response.status === 429) setError(t.errors.rateLimited);
        else if (response.status === 413) setError(t.errors.tooLarge);
        else if (response.status === 415) setError(t.errors.type);
        else setError(payload?.error ?? t.errors.generic);
        return;
      }
      if (!payload || payload.status === "failed") {
        setError(payload?.error ?? t.errors.generic);
        return;
      }
      setResult(payload);
    } catch {
      setError(t.errors.generic);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="space-y-12">
      <Hero
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        icon={<UploadCloud className="h-3.5 w-3.5 text-[var(--accent)]" />}
      />

      <div className="grid gap-8 lg:grid-cols-3">
        {t.steps.map((step, index) => (
          <article key={step.title} className="service-card">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">{`0${index + 1}`}</p>
            {index === 0 ? <UploadCloud className="mb-4 h-6 w-6 text-[var(--ink)] opacity-80" /> : null}
            {index === 1 ? <Scale className="mb-4 h-6 w-6 text-[var(--ink)] opacity-80" /> : null}
            {index === 2 ? <FileText className="mb-4 h-6 w-6 text-[var(--ink)] opacity-80" /> : null}
            <h3 className="text-xl font-medium text-[var(--ink)] font-serif">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">{step.body}</p>
          </article>
        ))}
      </div>

      {result ? (
        <CollaborateResultView locale={locale} result={result} onReset={() => setResult(null)} />
      ) : (
        <div className="mx-auto w-full max-w-2xl">
          <label
            onDragOver={(event) => {
              event.preventDefault();
              if (!uploading) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file && !uploading) void upload(file);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
              dragging
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--border-strong)] bg-white/40 hover:border-[var(--accent)]"
            } ${uploading ? "pointer-events-none opacity-70" : ""}`}
          >
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.csv,.xlsx,.xls,.txt,.md,.json,application/pdf,text/csv,text/plain"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
            <UploadCloud className="h-10 w-10 text-[var(--accent)]" />
            {uploading ? (
              <p className="text-sm font-medium text-[var(--muted-strong)]">{t.uploading}</p>
            ) : (
              <>
                <p className="text-base font-medium text-[var(--ink)] font-serif">{t.dropTitle}</p>
                <p className="text-sm text-[var(--muted-strong)]">{t.dropBody}</p>
                <span className="hero-button-solid mt-2">{t.choose}</span>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{t.dropHint}</p>
              </>
            )}
          </label>

          {error ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--border-strong)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
              <span>{error}</span>
            </div>
          ) : null}

          <p className="mt-6 text-center text-xs leading-relaxed text-[var(--muted-strong)]">{t.bucketNote}</p>
        </div>
      )}
    </section>
  );
}

function CollaborateResultView({
  locale,
  result,
  onReset,
}: {
  locale: Locale;
  result: CollaborateResult;
  onReset: () => void;
}) {
  const t = copy[locale].collaborate.result;
  const isDuplicate = result.status === "duplicate";
  const document = result.document ?? null;
  const extractions = (document?.extractions ?? []).slice(0, 12);
  const duplicates = result.possibleDuplicates ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="rounded-2xl border border-[var(--border-strong)] bg-white/60 p-6">
        <div className="mb-3 flex items-center gap-2">
          {isDuplicate ? (
            <Scale className="h-5 w-5 text-[var(--accent)]" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
          )}
          <h3 className="text-lg font-medium text-[var(--ink)] font-serif">
            {isDuplicate ? t.duplicateTitle : t.newTitle}
          </h3>
        </div>
        <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
          {isDuplicate ? t.duplicateBody : t.newBody}
        </p>

        {document ? (
          <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--muted-strong)]" />
              <span className="text-sm font-medium text-[var(--ink)]">{document.title}</span>
              {document.classification ? (
                <span className="rounded-full border border-[var(--border-strong)] bg-white/70 px-3 py-0.5 text-xs text-[var(--muted-strong)]">
                  {t.classificationLabel}: {document.classification.label}
                </span>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{t.extractionsLabel}</p>
              {extractions.length ? (
                <ul className="flex flex-wrap gap-2">
                  {extractions.map((item, index) => (
                    <li
                      key={`${item.type}-${index}`}
                      className="rounded-lg border border-[var(--border)] bg-white/50 px-3 py-1 text-xs text-[var(--ink)]"
                    >
                      <span className="text-[var(--muted-strong)]">{item.type}:</span> {item.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--muted-strong)]">{t.noExtractions}</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {duplicates.length ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/40 p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{t.possibleDuplicatesLabel}</p>
          <ul className="space-y-2">
            {duplicates.map((item) => (
              <li key={item.documentId} className="flex items-center justify-between gap-3 text-sm text-[var(--ink)]">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[var(--muted-strong)]" />
                  {item.title}
                </span>
                <span className="text-xs text-[var(--muted)]">{Math.round(item.score * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex justify-center">
        <button type="button" className="ghost-button" onClick={onReset}>
          {t.another}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FeaturesPage({ locale }: { locale: Locale }) {
  const t = copy[locale].features;
  return (
    <section className="space-y-16">
      <Hero eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} icon={<Gauge className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      <div className="space-y-14">
        {t.groups.map((group) => (
          <div key={group.tag} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2fr] lg:items-start">
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
      <div className="grid gap-6 lg:grid-cols-3">
        {t.paths.map((path) => (
          <article key={path.to} className="service-card flex flex-col">
            <p className="mb-4 inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              {path.to === "scrutiny" ? <BarChart3 className="h-4 w-4" /> : path.to === "collaborate" ? <UploadCloud className="h-4 w-4" /> : <Landmark className="h-4 w-4" />} {path.tag}
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

type MeProfile = { id: string; name: string; email: string };
type MeRequest = {
  publicId: string;
  institutionSlug: string;
  category: string;
  title: string;
  status: string;
  createdAt: string;
};
type MeContribution = {
  filename: string;
  status: string;
  documentId: string | null;
  classificationLabel: string | null;
  createdAt: string;
};

function formatDate(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function AccountPage({ locale }: { locale: Locale }) {
  const t = copy[locale].account;
  const [phase, setPhase] = useState<"loading" | "signedOut" | "signedIn">("loading");
  const [user, setUser] = useState<MeProfile | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/public/auth/session", { credentials: "include" });
        const data = (await res.json().catch(() => null)) as { user?: MeProfile | null } | null;
        if (!active) return;
        if (data?.user) {
          setUser(data.user);
          setPhase("signedIn");
        } else {
          setPhase("signedOut");
        }
      } catch {
        if (active) setPhase("signedOut");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-12">
      <Hero eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} icon={<UserCircle className="h-3.5 w-3.5 text-[var(--accent)]" />} />
      {phase === "loading" ? (
        <p className="text-center text-sm text-[var(--muted-strong)]">{t.loading}</p>
      ) : null}
      {phase === "signedOut" ? (
        <AccountAuth
          locale={locale}
          onSignedIn={(u) => {
            setUser(u);
            setPhase("signedIn");
          }}
        />
      ) : null}
      {phase === "signedIn" && user ? (
        <AccountDashboard
          locale={locale}
          user={user}
          onSignedOut={() => {
            setUser(null);
            setPhase("signedOut");
          }}
        />
      ) : null}
    </section>
  );
}

function AccountAuth({ locale, onSignedIn }: { locale: Locale; onSignedIn: (user: MeProfile) => void }) {
  const t = copy[locale].account;
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email || !password || (tab === "signup" && !name)) {
      setError(t.errors.required);
      return;
    }
    if (tab === "signup" && password.length < 8) {
      setError(t.errors.weakPassword);
      return;
    }
    setBusy(true);
    try {
      const endpoint = tab === "signin" ? "/api/public/auth/sign-in" : "/api/public/auth/sign-up";
      const body = tab === "signin" ? { email, password } : { name, email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { user?: MeProfile; error?: string } | null;
      if (!res.ok) {
        if (res.status === 409) setError(t.errors.exists);
        else if (res.status === 400 && tab === "signin") setError(t.errors.invalid);
        else setError(data?.error ?? t.errors.generic);
        return;
      }
      if (data?.user) onSignedIn(data.user);
    } catch {
      setError(t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      active ? "bg-[var(--ink)] text-[var(--page)]" : "text-[var(--muted-strong)] hover:text-[var(--ink)]"
    }`;
  const inputClass =
    "w-full rounded-lg border border-[var(--border-strong)] bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]";

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 flex gap-1 rounded-xl border border-[var(--border-strong)] bg-white/40 p-1">
        <button type="button" className={tabClass(tab === "signin")} onClick={() => { setTab("signin"); setError(null); }}>
          {t.signInTab}
        </button>
        <button type="button" className={tabClass(tab === "signup")} onClick={() => { setTab("signup"); setError(null); }}>
          {t.signUpTab}
        </button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        {tab === "signup" ? (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{t.nameLabel}</span>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{t.emailLabel}</span>
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{t.passwordLabel}</span>
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={tab === "signin" ? "current-password" : "new-password"} />
        </label>
        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--border-strong)] bg-white/60 px-3 py-2 text-sm text-[var(--ink)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span>{error}</span>
          </div>
        ) : null}
        <button type="submit" disabled={busy} className="hero-button-solid w-full justify-center disabled:opacity-60">
          {busy ? t.working : tab === "signin" ? t.signInCta : t.signUpCta}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-[var(--muted-strong)]">
        {t.operatorNote}{" "}
        <a className="font-medium text-[var(--ink)] underline hover:text-[var(--accent)]" href={`${adminShellUrl}/admin/auth`}>
          {t.operatorCta}
        </a>
      </p>
    </div>
  );
}

function AccountDashboard({ locale, user, onSignedOut }: { locale: Locale; user: MeProfile; onSignedOut: () => void }) {
  const t = copy[locale].account;
  const [requests, setRequests] = useState<MeRequest[] | null>(null);
  const [contributions, setContributions] = useState<MeContribution[] | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [reqs, contribs] = await Promise.all([
        fetch("/api/public/me/requests", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        fetch("/api/public/me/contributions", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ]);
      if (!active) return;
      setRequests(reqs as MeRequest[]);
      setContributions(contribs as MeContribution[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/public/auth/sign-out", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    } finally {
      onSignedOut();
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-strong)] bg-white/60 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{t.greeting}</p>
          <p className="text-base font-medium text-[var(--ink)]">{user.name}</p>
          <p className="text-sm text-[var(--muted-strong)]">{user.email}</p>
        </div>
        <button type="button" className="ghost-button" onClick={signOut} disabled={signingOut}>
          {t.signOut}
        </button>
      </div>

      <section>
        <h3 className="mb-3 text-lg font-medium text-[var(--ink)] font-serif">{t.requestsTitle}</h3>
        {requests === null ? (
          <p className="text-sm text-[var(--muted-strong)]">{t.loading}</p>
        ) : requests.length ? (
          <ul className="space-y-2">
            {requests.map((req) => (
              <li key={req.publicId} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/50 px-4 py-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-[var(--ink)]">
                  <ScrollText className="h-4 w-4 shrink-0 text-[var(--muted-strong)]" />
                  <span className="truncate">{req.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-[var(--muted)] sm:inline">{formatDate(req.createdAt, locale)}</span>
                  <span className="rounded-full border border-[var(--border-strong)] px-3 py-0.5 text-xs text-[var(--muted-strong)]">{req.status}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-white/30 px-4 py-6 text-center text-sm text-[var(--muted-strong)]">{t.requestsEmpty}</p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-medium text-[var(--ink)] font-serif">{t.contributionsTitle}</h3>
          <a className="ghost-button" href={routePath(locale, "collaborate")}>
            {t.contributeCta}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        {contributions === null ? (
          <p className="text-sm text-[var(--muted-strong)]">{t.loading}</p>
        ) : contributions.length ? (
          <ul className="space-y-2">
            {contributions.map((item, index) => (
              <li key={`${item.filename}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/50 px-4 py-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-[var(--ink)]">
                  <FileText className="h-4 w-4 shrink-0 text-[var(--muted-strong)]" />
                  <span className="truncate">{item.filename}</span>
                  {item.classificationLabel ? (
                    <span className="shrink-0 text-xs text-[var(--muted)]">· {item.classificationLabel}</span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-[var(--muted)] sm:inline">{formatDate(item.createdAt, locale)}</span>
                  <span className="rounded-full border border-[var(--border-strong)] px-3 py-0.5 text-xs text-[var(--muted-strong)]">
                    {item.status === "duplicate" ? t.statusDuplicate : t.statusIngested}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-white/30 px-4 py-6 text-center text-sm text-[var(--muted-strong)]">{t.contributionsEmpty}</p>
        )}
      </section>
    </div>
  );
}

function InstitutionSearch({ locale }: { locale: Locale }) {
  const t = copy[locale].scrutiny;
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [results, setResults] = useState<PublicSearchResult[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        setResults(await searchPublic(query, { signal: controller.signal }));
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
      <div className="mt-6 grid grid-cols-1 gap-4">
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
      <div className="mt-6 text-center">
        <a
          href={`${routePath(locale, "explore")}${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]"
        >
          <MapPin className="h-3.5 w-3.5" />
          {t.mapCta}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
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
    <section className="grid grid-cols-1 gap-12 border-t border-[var(--border)] pt-16 lg:grid-cols-[1fr_2fr] lg:items-start">
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
