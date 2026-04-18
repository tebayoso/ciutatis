import {
  PUBLIC_REQUEST_CATEGORIES,
  PUBLIC_REQUEST_STATUSES,
  type PublicRequestCategory,
  type PublicRequestStatus,
} from "@paperclipai/shared";

export type PortalLocale = "en" | "es";

export function getPortalLocale(pathname: string): PortalLocale {
  return pathname.startsWith("/es/") ? "es" : "en";
}

export function portalPath(locale: PortalLocale, suffix = "") {
  const base = locale === "es" ? "/es/portal" : "/portal";
  if (!suffix) return base;
  return `${base}/${suffix.replace(/^\/+/, "")}`;
}

export function portalInstitutionPath(locale: PortalLocale, institutionSlug: string) {
  return portalPath(locale, institutionSlug);
}

export function portalRequestPath(locale: PortalLocale, publicId: string) {
  return portalPath(locale, `requests/${publicId}`);
}

export const PORTAL_CATEGORY_LABELS: Record<PortalLocale, Record<PublicRequestCategory, string>> = {
  en: {
    infrastructure: "Infrastructure",
    sanitation: "Sanitation",
    mobility: "Mobility",
    safety: "Safety",
    permits: "Permits",
    housing: "Housing",
    environment: "Environment",
    corruption: "Corruption / abuse",
    other: "Other",
  },
  es: {
    infrastructure: "Infraestructura",
    sanitation: "Saneamiento",
    mobility: "Movilidad",
    safety: "Seguridad",
    permits: "Permisos",
    housing: "Vivienda",
    environment: "Ambiente",
    corruption: "Corrupcion / abuso",
    other: "Otro",
  },
};

export const PORTAL_STATUS_LABELS: Record<PortalLocale, Record<PublicRequestStatus, string>> = {
  en: {
    received: "Received",
    triage: "Triage",
    routed: "Routed",
    in_progress: "In progress",
    waiting_on_city: "Waiting on city",
    resolved: "Resolved",
    closed: "Closed",
  },
  es: {
    received: "Recibido",
    triage: "Triage",
    routed: "Derivado",
    in_progress: "En curso",
    waiting_on_city: "En espera del municipio",
    resolved: "Resuelto",
    closed: "Cerrado",
  },
};

export const PORTAL_STATUS_TONE: Record<PublicRequestStatus, string> = {
  received: "bg-slate-900 text-white",
  triage: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30",
  routed: "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/30",
  in_progress: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30",
  waiting_on_city: "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/30",
  resolved: "bg-emerald-600 text-white",
  closed: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
};

export const PORTAL_COPY = {
  en: {
    eyebrow: "Public civic routing",
    title: "A civic portal where people can file once and watch the case move.",
    intro:
      "Residents can open a report, ask for help, or document abuse. Agents classify, route, and keep the public ledger updated without exposing private information.",
    intakeTitle: "Open a public request",
    intakeBody:
      "Every case becomes a public, anonymized record. Contact details stay private when you choose a signed or guest flow.",
    feedTitle: "Live public ledger",
    feedBody:
      "Browse recent requests, see where they were routed, and understand what is still waiting on the city.",
    signedIn: "Signed in",
    accountMode: "Account",
    guestMode: "Guest",
    anonymousMode: "Anonymous",
    accountHint: "Own the request from your account and reply without a recovery code.",
    guestHint: "No account needed. You will get a recovery code after submit.",
    anonymousHint: "Best for corruption or sensitive reporting. No follow-up channel.",
    institutionLabel: "City or institution",
    categoryLabel: "Category",
    locationLabel: "Location or reference",
    titleLabel: "Headline",
    descriptionLabel: "What happened",
    contactNameLabel: "Name",
    contactEmailLabel: "Email",
    submit: "Publish request",
    signInCta: "Create account to file from your profile",
    boardEmpty: "No public requests yet.",
    boardEmptyHint: "The next civic request opened here will appear after privacy protection runs.",
    searchPlaceholder: "Search public requests",
    allInstitutions: "All cities",
    allStatuses: "All statuses",
    followUpTitle: "Add follow-up",
    followUpHintGuest: "Enter the recovery code you received when you submitted the request.",
    followUpHintAccount: "Only the account that opened the request can reply.",
    followUpHintAnonymous: "Anonymous requests do not support replies.",
    recoveryCode: "Recovery code",
    replyBody: "New public-safe context",
    submitReply: "Post follow-up",
    requestMissing: "This public request does not exist or is no longer available.",
    cityMissing: "This city portal is not configured on this instance.",
    backToPortal: "Back to portal",
    openCityPortal: "Open city portal",
    privacyNote:
      "The public page shows a privacy-filtered version of the request. Raw contact details are never shown on the board.",
    recoverySaved: "Recovery code saved locally for this browser.",
    copyRecovery: "Save this recovery code. It is required to post follow-up messages later.",
  },
  es: {
    eyebrow: "Enrutamiento civico publico",
    title: "Un portal civico donde la gente reporta una vez y puede seguir el caso.",
    intro:
      "Las personas pueden abrir un reporte, pedir ayuda o documentar abuso. Los agentes clasifican, derivan y actualizan el registro publico sin exponer informacion privada.",
    intakeTitle: "Abrir un pedido publico",
    intakeBody:
      "Cada caso se convierte en un registro publico anonimizado. Los datos de contacto quedan privados cuando eliges cuenta o invitado.",
    feedTitle: "Registro publico en vivo",
    feedBody:
      "Explora pedidos recientes, ve a donde fueron derivados y entiende que sigue esperando respuesta municipal.",
    signedIn: "Sesion iniciada",
    accountMode: "Cuenta",
    guestMode: "Invitado",
    anonymousMode: "Anonimo",
    accountHint: "El pedido queda ligado a tu cuenta y puedes responder sin codigo.",
    guestHint: "No hace falta cuenta. Recibiras un codigo de recuperacion al enviar.",
    anonymousHint: "Ideal para corrupcion o reportes sensibles. No tiene canal de seguimiento.",
    institutionLabel: "Ciudad o institucion",
    categoryLabel: "Categoria",
    locationLabel: "Ubicacion o referencia",
    titleLabel: "Titulo breve",
    descriptionLabel: "Que paso",
    contactNameLabel: "Nombre",
    contactEmailLabel: "Email",
    submit: "Publicar pedido",
    signInCta: "Crear cuenta para presentar desde tu perfil",
    boardEmpty: "Todavia no hay pedidos publicos.",
    boardEmptyHint: "El proximo pedido civico que entre aqui aparecera despues de la proteccion de privacidad.",
    searchPlaceholder: "Buscar pedidos publicos",
    allInstitutions: "Todas las ciudades",
    allStatuses: "Todos los estados",
    followUpTitle: "Agregar seguimiento",
    followUpHintGuest: "Ingresa el codigo de recuperacion que recibiste al enviar el pedido.",
    followUpHintAccount: "Solo la cuenta que abrio el pedido puede responder.",
    followUpHintAnonymous: "Los pedidos anonimos no admiten respuestas.",
    recoveryCode: "Codigo de recuperacion",
    replyBody: "Nuevo contexto publico",
    submitReply: "Publicar seguimiento",
    requestMissing: "Este pedido publico no existe o ya no esta disponible.",
    cityMissing: "Este portal de ciudad no esta configurado en esta instancia.",
    backToPortal: "Volver al portal",
    openCityPortal: "Abrir portal de ciudad",
    privacyNote:
      "La pagina publica muestra una version filtrada por privacidad. Los datos de contacto reales nunca aparecen en el tablero.",
    recoverySaved: "El codigo de recuperacion se guardo en este navegador.",
    copyRecovery: "Guarda este codigo de recuperacion. Lo necesitaras para agregar seguimiento mas adelante.",
  },
} as const;

export const PORTAL_CATEGORY_OPTIONS = PUBLIC_REQUEST_CATEGORIES;
export const PORTAL_STATUS_OPTIONS = PUBLIC_REQUEST_STATUSES;
