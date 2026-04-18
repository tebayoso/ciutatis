export const PUBLIC_PORTAL_LOCALES = ["en", "es"] as const;
export type PublicPortalLocale = (typeof PUBLIC_PORTAL_LOCALES)[number];

export const PUBLIC_SUBMISSION_MODES = ["account", "guest", "anonymous"] as const;
export type PublicSubmissionMode = (typeof PUBLIC_SUBMISSION_MODES)[number];

export const PUBLIC_REQUEST_CATEGORIES = [
  "infrastructure",
  "sanitation",
  "mobility",
  "safety",
  "permits",
  "housing",
  "environment",
  "corruption",
  "other",
] as const;
export type PublicRequestCategory = (typeof PUBLIC_REQUEST_CATEGORIES)[number];

export const PUBLIC_REQUEST_STATUSES = [
  "received",
  "triage",
  "routed",
  "in_progress",
  "waiting_on_city",
  "resolved",
  "closed",
] as const;
export type PublicRequestStatus = (typeof PUBLIC_REQUEST_STATUSES)[number];

export const PUBLIC_REQUEST_UPDATE_KINDS = ["system", "citizen_follow_up", "status_change"] as const;
export type PublicRequestUpdateKind = (typeof PUBLIC_REQUEST_UPDATE_KINDS)[number];

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{3,4}\b/g;
const URL_RE = /\bhttps?:\/\/[^\s]+/gi;
const LONG_NUMBER_RE = /\b\d{7,}\b/g;
const SELF_IDENTIFICATION_RE =
  /\b(?:my name is|i am|i'm|me llamo|soy)\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ'-]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ'-]+){0,2}/g;
const ADDRESS_RE =
  /\b(?:\d{1,5}\s+(?:[A-Za-zÁÉÍÓÚÑáéíóúñ.'-]+\s){0,4}(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|calle|avenida|av|pasaje))\b/gi;

function collapseWhitespace(input: string) {
  return input.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

export function slugifyPublicText(input: string) {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "city";
}

export function buildInstitutionPortalSlug(name: string, issuePrefix?: string | null) {
  const prefix = issuePrefix?.trim().toLowerCase();
  const base = slugifyPublicText(name);
  return prefix ? `${prefix}-${base}` : base;
}

export function redactPublicText(input: string): { text: string; piiDetected: boolean } {
  if (!input.trim()) {
    return { text: "", piiDetected: false };
  }

  const replacements: Array<[RegExp, string]> = [
    [EMAIL_RE, "[email removed]"],
    [PHONE_RE, "[phone removed]"],
    [URL_RE, "[link removed]"],
    [ADDRESS_RE, "[address removed]"],
    [SELF_IDENTIFICATION_RE, "[identity removed]"],
    [LONG_NUMBER_RE, "[number removed]"],
  ];

  let result = input;
  let piiDetected = false;

  for (const [pattern, replacement] of replacements) {
    const next = result.replace(pattern, replacement);
    if (next !== result) {
      piiDetected = true;
      result = next;
    }
  }

  return {
    text: collapseWhitespace(result),
    piiDetected,
  };
}

export function buildPublicSummary(input: string, maxLength = 220) {
  const clean = collapseWhitespace(input).replace(/\n+/g, " ");
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function derivePublicRequestStatus(issueStatus: string): PublicRequestStatus {
  switch (issueStatus) {
    case "backlog":
      return "received";
    case "todo":
      return "triage";
    case "in_progress":
      return "in_progress";
    case "in_review":
      return "routed";
    case "blocked":
      return "waiting_on_city";
    case "done":
      return "resolved";
    case "cancelled":
      return "closed";
    default:
      return "triage";
  }
}

export function createPublicRequestId(identifier: string | null | undefined, fallbackId: string) {
  if (identifier?.trim()) {
    return identifier.trim().toLowerCase();
  }
  return fallbackId.toLowerCase();
}
