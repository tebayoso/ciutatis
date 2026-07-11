// Stub - company-portability feature intentionally removed from Ciutatis
// This file exists only to satisfy upstream imports

import type { Db } from "@paperclipai/db";
import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { and, eq, inArray } from "drizzle-orm";
import { builtInManagedResources, principalPermissionGrants, type Db } from "@paperclipai/db";
import type {
  CompanyPortabilityAgentManifestEntry,
  CompanyPortabilityCollisionStrategy,
  CompanyPortabilityEnvInput,
  CompanyPortabilityExport,
  CompanyPortabilityFileEntry,
  CompanyPortabilityExportPreviewResult,
  CompanyPortabilityExportResult,
  CompanyPortabilityImport,
  CompanyPortabilityImportResult,
  CompanyPortabilityInclude,
  CompanyPortabilityManifest,
  CompanyPortabilityIssueCommentManifestEntry,
  CompanyPortabilityPreview,
  CompanyPortabilityPreviewAgentPlan,
  CompanyPortabilityPreviewResult,
  CompanyPortabilityProjectManifestEntry,
  CompanyPortabilityProjectWorkspaceManifestEntry,
  CompanyPortabilityIssueRoutineManifestEntry,
  CompanyPortabilityIssueRoutineTriggerManifestEntry,
  CompanyPortabilityIssueManifestEntry,
  CompanyPortabilitySidebarOrder,
  CompanyPortabilitySkillManifestEntry,
  CompanySkill,
  AgentEnvConfig,
  PermissionKey,
  RoutineVariable,
} from "@paperclipai/shared";
import {
  AGENT_DEFAULT_MAX_CONCURRENT_RUNS,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PROJECT_ICON_NAMES,
  PROJECT_STATUSES,
  ROUTINE_CATCH_UP_POLICIES,
  ROUTINE_CONCURRENCY_POLICIES,
  ROUTINE_STATUSES,
  ROUTINE_TRIGGER_KINDS,
  ROUTINE_TRIGGER_SIGNING_MODES,
  deriveProjectUrlKey,
  envConfigSchema,
  issueCommentAuthorTypeSchema,
  issueCommentMetadataSchema,
  issueCommentPresentationSchema,
  normalizeAgentUrlKey,
  PERMISSION_KEYS,
} from "@paperclipai/shared";
import {
  readPaperclipSkillSyncPreference,
  writePaperclipSkillSyncPreference,
} from "@paperclipai/adapter-utils/server-utils";
import { requireOpenCodeModelId } from "@paperclipai/adapter-opencode-local/server";
import { findServerAdapter } from "../adapters/index.js";
import { forbidden, notFound, unprocessable } from "../errors.js";
import { ghFetch, gitHubApiBase, resolveRawGitHubUrl } from "./github-fetch.js";
import type { StorageService } from "../storage/types.js";
import { accessService } from "./access.js";
import { agentService } from "./agents.js";
import { agentInstructionsService } from "./agent-instructions.js";
import { assetService } from "./assets.js";
import { generateReadme } from "./company-export-readme.js";
import { renderOrgChartPng, type OrgNode } from "../routes/org-chart-svg.js";
import { companyService } from "./companies.js";
import { validateCron } from "./cron.js";
import { issueService } from "./issues.js";
import { projectService } from "./projects.js";
import { secretService } from "./secrets.js";
import { getConfiguredSecretProvider } from "../secrets/configured-provider.js";
import {
  PORTABLE_CATALOG_PROVENANCE_STRING_KEYS,
  readCatalogStringList,
  readPortableCatalogProvenance,
} from "./catalog-provenance.js";
import { readBuiltInAgentMarker } from "./built-in-agent-metadata.js";
import { normalizePortablePath } from "./portable-path.js";

export interface CompanyPortabilityService {
  exportCompany(): Promise<unknown>;
  importCompany(): Promise<unknown>;
  previewImport(_body?: unknown): Promise<unknown>;
  exportBundle(_companyId: string, _body?: unknown): Promise<unknown>;
  importBundle(_body: unknown, _userId?: string | null): Promise<unknown>;
}

export function companyPortabilityService(_db: Db): CompanyPortabilityService {
  return {
    async exportCompany() {
      throw new Error("Company portability not available in Ciutatis");
const DEFAULT_INCLUDE: CompanyPortabilityInclude = {
  company: true,
  agents: true,
  projects: false,
  issues: false,
  skills: false,
};

const DEFAULT_COLLISION_STRATEGY: CompanyPortabilityCollisionStrategy = "rename";
const IMPORT_FORBIDDEN_ADAPTER_TYPES = new Set(["process", "http"]);
const execFileAsync = promisify(execFile);
let bundledSkillsCommitPromise: Promise<string | null> | null = null;

function resolveImportMode(options?: ImportBehaviorOptions): ImportMode {
  return options?.mode ?? "board_full";
}

function resolveSkillConflictStrategy(mode: ImportMode, collisionStrategy: CompanyPortabilityCollisionStrategy) {
  if (mode === "board_full") return "replace" as const;
  return collisionStrategy === "skip" ? "skip" as const : "rename" as const;
}

function collectAgentSafeImportPolicyErrors(
  manifest: CompanyPortabilityManifest,
  include: CompanyPortabilityInclude,
) {
  const errors: string[] = [];
  if (include.projects) {
    for (const project of manifest.projects) {
      if (project.executionWorkspacePolicy !== null) {
        errors.push(`Safe import does not allow project ${project.slug} executionWorkspacePolicy.`);
      }
      for (const workspace of project.workspaces) {
        if (workspace.setupCommand) {
          errors.push(`Safe import does not allow project ${project.slug} workspace ${workspace.key} setupCommand.`);
        }
        if (workspace.cleanupCommand) {
          errors.push(`Safe import does not allow project ${project.slug} workspace ${workspace.key} cleanupCommand.`);
        }
      }
    }
  }
  if (include.issues) {
    for (const issue of manifest.issues) {
      if (issue.executionWorkspaceSettings !== null) {
        errors.push(`Safe import does not allow task ${issue.slug} executionWorkspaceSettings.`);
      }
      if (issue.assigneeAdapterOverrides !== null) {
        errors.push(`Safe import does not allow task ${issue.slug} assigneeAdapterOverrides.`);
      }
      const triggers = issue.routine?.triggers ?? [];
      for (const trigger of triggers) {
        if (trigger.kind !== "schedule") {
          errors.push(`Safe import does not allow routine task ${issue.slug} ${trigger.kind} triggers.`);
        }
      }
    }
  }
  return errors;
}

function classifyPortableFileKind(pathValue: string): CompanyPortabilityExportPreviewResult["fileInventory"][number]["kind"] {
  const normalized = normalizePortablePath(pathValue);
  if (normalized === "COMPANY.md") return "company";
  if (normalized === ".paperclip.yaml" || normalized === ".paperclip.yml") return "extension";
  if (normalized === "README.md") return "readme";
  if (normalized.startsWith("agents/")) return "agent";
  if (normalized.startsWith("skills/")) return "skill";
  if (normalized.startsWith("projects/")) return "project";
  if (normalized.startsWith("tasks/")) return "issue";
  return "other";
}

function normalizeSkillSlug(value: string | null | undefined) {
  return value ? normalizeAgentUrlKey(value) ?? null : null;
}

function normalizeSkillKey(value: string | null | undefined) {
  if (!value) return null;
  const segments = value
    .split("/")
    .map((segment) => normalizeSkillSlug(segment))
    .filter((segment): segment is string => Boolean(segment));
  return segments.length > 0 ? segments.join("/") : null;
}

function readSkillKey(frontmatter: Record<string, unknown>) {
  const metadata = isPlainRecord(frontmatter.metadata) ? frontmatter.metadata : null;
  const paperclip = isPlainRecord(metadata?.paperclip) ? metadata?.paperclip as Record<string, unknown> : null;
  return normalizeSkillKey(
    asString(frontmatter.key)
    ?? asString(frontmatter.skillKey)
    ?? asString(metadata?.skillKey)
    ?? asString(metadata?.canonicalKey)
    ?? asString(metadata?.paperclipSkillKey)
    ?? asString(paperclip?.skillKey)
    ?? asString(paperclip?.key),
  );
}

function deriveManifestSkillKey(
  frontmatter: Record<string, unknown>,
  fallbackSlug: string,
  metadata: Record<string, unknown> | null,
  sourceType: string,
  sourceLocator: string | null,
) {
  const explicit = readSkillKey(frontmatter);
  if (explicit) return explicit;
  const slug = normalizeSkillSlug(asString(frontmatter.slug) ?? fallbackSlug) ?? "skill";
  const sourceKind = asString(metadata?.sourceKind);
  const owner = normalizeSkillSlug(asString(metadata?.owner));
  const repo = normalizeSkillSlug(asString(metadata?.repo));
  if ((sourceType === "github" || sourceType === "skills_sh" || sourceKind === "github" || sourceKind === "skills_sh") && owner && repo) {
    return `${owner}/${repo}/${slug}`;
  }
  if (sourceKind === "paperclip_bundled") {
    return `paperclipai/paperclip/${slug}`;
  }
  if (sourceType === "url" || sourceKind === "url") {
    try {
      const host = normalizeSkillSlug(sourceLocator ? new URL(sourceLocator).host : null) ?? "url";
      return `url/${host}/${slug}`;
    } catch {
      return `url/unknown/${slug}`;
    }
  }
  return slug;
}

function hashSkillValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function normalizeExportPathSegment(value: string | null | undefined, preserveCase = false) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) return null;
  return preserveCase ? normalized : normalized.toLowerCase();
}

function readSkillSourceKind(skill: CompanySkill) {
  const metadata = isPlainRecord(skill.metadata) ? skill.metadata : null;
  return asString(metadata?.sourceKind);
}

function buildPortableCatalogProvenance(skill: CompanySkill) {
  if (skill.sourceType !== "catalog") return null;
  const metadata = isPlainRecord(skill.metadata) ? skill.metadata : null;
  const provenance: Record<string, unknown> = {
    skillKey: skill.key,
  };

  const sourceRef = asString(skill.sourceRef) ?? asString(metadata?.originHash);
  if (sourceRef) provenance.sourceRef = sourceRef;

  for (const key of PORTABLE_CATALOG_PROVENANCE_STRING_KEYS) {
    if (key === "sourceRef") continue;
    const value = asString(metadata?.[key]);
    if (value) provenance[key] = value;
  }

  const auditCodes = readCatalogStringList(metadata?.auditCodes);
  if (auditCodes) provenance.auditCodes = auditCodes;

  return Object.keys(provenance).length > 1 ? provenance : null;
}

function deriveLocalExportNamespace(skill: CompanySkill, slug: string) {
  const metadata = isPlainRecord(skill.metadata) ? skill.metadata : null;
  const candidates = [
    asString(metadata?.projectName),
    asString(metadata?.workspaceName),
  ];

  if (skill.sourceLocator) {
    const basename = path.basename(skill.sourceLocator);
    candidates.push(basename.toLowerCase() === "skill.md" ? path.basename(path.dirname(skill.sourceLocator)) : basename);
  }

  for (const value of candidates) {
    const normalized = normalizeSkillSlug(value);
    if (normalized && normalized !== slug) return normalized;
  }

  return null;
}

function derivePrimarySkillExportDir(
  skill: CompanySkill,
  slug: string,
  companyIssuePrefix: string | null | undefined,
) {
  const normalizedKey = normalizeSkillKey(skill.key);
  const keySegments = normalizedKey?.split("/") ?? [];
  const primaryNamespace = keySegments[0] ?? null;

  if (primaryNamespace === "company") {
    const companySegment = normalizeExportPathSegment(companyIssuePrefix, true)
      ?? normalizeExportPathSegment(keySegments[1], true)
      ?? "company";
    return `skills/company/${companySegment}/${slug}`;
  }

  if (primaryNamespace === "local") {
    const localNamespace = deriveLocalExportNamespace(skill, slug);
    return localNamespace
      ? `skills/local/${localNamespace}/${slug}`
      : `skills/local/${slug}`;
  }

  if (primaryNamespace === "url") {
    let derivedHost: string | null = keySegments[1] ?? null;
    if (!derivedHost) {
      try {
        derivedHost = normalizeSkillSlug(skill.sourceLocator ? new URL(skill.sourceLocator).host : null);
      } catch {
        derivedHost = null;
      }
    }
    const host = derivedHost ?? "url";
    return `skills/url/${host}/${slug}`;
  }

  if (keySegments.length > 1) {
    return `skills/${keySegments.join("/")}`;
  }

  return `skills/${slug}`;
}

function appendSkillExportDirSuffix(packageDir: string, suffix: string) {
  const lastSeparator = packageDir.lastIndexOf("/");
  if (lastSeparator < 0) return `${packageDir}--${suffix}`;
  return `${packageDir.slice(0, lastSeparator + 1)}${packageDir.slice(lastSeparator + 1)}--${suffix}`;
}

function deriveSkillExportDirCandidates(
  skill: CompanySkill,
  slug: string,
  companyIssuePrefix: string | null | undefined,
) {
  const primaryDir = derivePrimarySkillExportDir(skill, slug, companyIssuePrefix);
  const metadata = isPlainRecord(skill.metadata) ? skill.metadata : null;
  const sourceKind = readSkillSourceKind(skill);
  const suffixes = new Set<string>();
  const pushSuffix = (value: string | null | undefined, preserveCase = false) => {
    const normalized = normalizeExportPathSegment(value, preserveCase);
    if (normalized && normalized !== slug) {
      suffixes.add(normalized);
    }
  };

  if (sourceKind === "paperclip_bundled") {
    pushSuffix("paperclip");
  }

  if (skill.sourceType === "github" || skill.sourceType === "skills_sh") {
    pushSuffix(asString(metadata?.repo));
    pushSuffix(asString(metadata?.owner));
    pushSuffix(skill.sourceType === "skills_sh" ? "skills_sh" : "github");
  } else if (skill.sourceType === "url") {
    try {
      pushSuffix(skill.sourceLocator ? new URL(skill.sourceLocator).host : null);
    } catch {
      // Ignore URL parse failures and fall through to generic suffixes.
    }
    pushSuffix("url");
  } else if (skill.sourceType === "local_path") {
    pushSuffix(asString(metadata?.projectName));
    pushSuffix(asString(metadata?.workspaceName));
    pushSuffix(deriveLocalExportNamespace(skill, slug));
    if (sourceKind === "managed_local") pushSuffix("company");
    if (sourceKind === "project_scan") pushSuffix("project");
    pushSuffix("local");
  } else {
    pushSuffix(sourceKind);
    pushSuffix("skill");
  }

  return [primaryDir, ...Array.from(suffixes, (suffix) => appendSkillExportDirSuffix(primaryDir, suffix))];
}

function buildSkillExportDirMap(skills: CompanySkill[], companyIssuePrefix: string | null | undefined) {
  const usedDirs = new Set<string>();
  const keyToDir = new Map<string, string>();
  const orderedSkills = [...skills].sort((left, right) => left.key.localeCompare(right.key));
  for (const skill of orderedSkills) {
    const slug = normalizeSkillSlug(skill.slug) ?? "skill";
    const candidates = deriveSkillExportDirCandidates(skill, slug, companyIssuePrefix);

    let packageDir = candidates.find((candidate) => !usedDirs.has(candidate)) ?? null;
    if (!packageDir) {
      packageDir = appendSkillExportDirSuffix(candidates[0] ?? `skills/${slug}`, hashSkillValue(skill.key));
      while (usedDirs.has(packageDir)) {
        packageDir = appendSkillExportDirSuffix(
          candidates[0] ?? `skills/${slug}`,
          hashSkillValue(`${skill.key}:${packageDir}`),
        );
      }
    }

    usedDirs.add(packageDir);
    keyToDir.set(skill.key, packageDir);
  }

  return keyToDir;
}

function isSensitiveEnvKey(key: string) {
  const normalized = key.trim().toLowerCase();
  return (
    normalized === "token" ||
    normalized.endsWith("_token") ||
    normalized.endsWith("-token") ||
    normalized.includes("apikey") ||
    normalized.includes("api_key") ||
    normalized.includes("api-key") ||
    normalized.includes("access_token") ||
    normalized.includes("access-token") ||
    normalized.includes("auth") ||
    normalized.includes("auth_token") ||
    normalized.includes("auth-token") ||
    normalized.includes("authorization") ||
    normalized.includes("bearer") ||
    normalized.includes("secret") ||
    normalized.includes("passwd") ||
    normalized.includes("password") ||
    normalized.includes("credential") ||
    normalized.includes("jwt") ||
    normalized.includes("privatekey") ||
    normalized.includes("private_key") ||
    normalized.includes("private-key") ||
    normalized.includes("cookie") ||
    normalized.includes("connectionstring")
  );
}

function normalizePortableProjectEnv(value: unknown): AgentEnvConfig | null {
  const parsed = envConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function normalizeProjectIconName(value: string | null | undefined): string | null {
  return value && PROJECT_ICON_NAMES.includes(value as typeof PROJECT_ICON_NAMES[number]) ? value : null;
}

function extractPortableScopedEnvInputs(
  scope: {
    label: string;
    warningPrefix: string;
    agentSlug: string | null;
    projectSlug: string | null;
  },
  envValue: unknown,
  warnings: string[],
): CompanyPortabilityEnvInput[] {
  if (!isPlainRecord(envValue)) return [];
  const env = envValue as Record<string, unknown>;
  const inputs: CompanyPortabilityEnvInput[] = [];

  for (const [key, binding] of Object.entries(env)) {
    if (key.toUpperCase() === "PATH") {
      warnings.push(`${scope.warningPrefix} PATH override was omitted from export because it is system-dependent.`);
      continue;
    }

    if (isPlainRecord(binding) && binding.type === "secret_ref") {
      inputs.push({
        key,
        description: `Provide ${key} for ${scope.label}`,
        agentSlug: scope.agentSlug,
        projectSlug: scope.projectSlug,
        kind: "secret",
        requirement: "optional",
        defaultValue: "",
        portability: "portable",
      });
      continue;
    }

    if (isPlainRecord(binding) && binding.type === "plain") {
      const defaultValue = asString(binding.value);
      const isSensitive = isSensitiveEnvKey(key);
      const portability = defaultValue && isAbsoluteCommand(defaultValue)
        ? "system_dependent"
        : "portable";
      if (portability === "system_dependent") {
        warnings.push(`${scope.warningPrefix} env ${key} default was exported as system-dependent.`);
      }
      inputs.push({
        key,
        description: `Optional default for ${key} on ${scope.label}`,
        agentSlug: scope.agentSlug,
        projectSlug: scope.projectSlug,
        kind: isSensitive ? "secret" : "plain",
        requirement: "optional",
        defaultValue: isSensitive ? "" : defaultValue ?? "",
        portability,
      });
      continue;
    }

    if (typeof binding === "string") {
      const portability = isAbsoluteCommand(binding) ? "system_dependent" : "portable";
      if (portability === "system_dependent") {
        warnings.push(`${scope.warningPrefix} env ${key} default was exported as system-dependent.`);
      }
      inputs.push({
        key,
        description: `Optional default for ${key} on ${scope.label}`,
        agentSlug: scope.agentSlug,
        projectSlug: scope.projectSlug,
        kind: isSensitiveEnvKey(key) ? "secret" : "plain",
        requirement: "optional",
        defaultValue: isSensitiveEnvKey(key) ? "" : binding,
        portability,
      });
    }
  }

  return inputs;
}

type ResolvedSource = {
  manifest: CompanyPortabilityManifest;
  files: Record<string, CompanyPortabilityFileEntry>;
  warnings: string[];
};

type MarkdownDoc = {
  frontmatter: Record<string, unknown>;
  body: string;
};

type CompanyPackageIncludeEntry = {
  path: string;
};

type PaperclipExtensionDoc = {
  schema?: string;
  company?: Record<string, unknown> | null;
  agents?: Record<string, Record<string, unknown>> | null;
  projects?: Record<string, Record<string, unknown>> | null;
  tasks?: Record<string, Record<string, unknown>> | null;
  routines?: Record<string, Record<string, unknown>> | null;
};

type ProjectLike = {
  id: string;
  name: string;
  description: string | null;
  leadAgentId: string | null;
  targetDate: string | null;
  color: string | null;
  icon: string | null;
  status: string;
  env: Record<string, unknown> | null;
  executionWorkspacePolicy: Record<string, unknown> | null;
  workspaces?: Array<{
    id: string;
    name: string;
    sourceType: string;
    cwd: string | null;
    repoUrl: string | null;
    repoRef: string | null;
    defaultRef: string | null;
    visibility: string;
    setupCommand: string | null;
    cleanupCommand: string | null;
    metadata?: Record<string, unknown> | null;
    isPrimary: boolean;
  }>;
  metadata?: Record<string, unknown> | null;
};

type IssueLike = {
  id: string;
  identifier: string | null;
  title: string;
  description: string | null;
  projectId: string | null;
  projectWorkspaceId: string | null;
  assigneeAgentId: string | null;
  status: string;
  priority: string;
  labelIds?: string[];
  billingCode: string | null;
  executionWorkspaceSettings: Record<string, unknown> | null;
  assigneeAdapterOverrides: Record<string, unknown> | null;
};

type RoutineLike = NonNullable<Awaited<ReturnType<ReturnType<typeof routineService>["getDetail"]>>>;

type ImportPlanInternal = {
  preview: CompanyPortabilityPreviewResult;
  source: ResolvedSource;
  include: CompanyPortabilityInclude;
  collisionStrategy: CompanyPortabilityCollisionStrategy;
  selectedAgents: CompanyPortabilityAgentManifestEntry[];
};

type ImportMode = "board_full" | "agent_safe";

type ImportBehaviorOptions = {
  mode?: ImportMode;
  sourceCompanyId?: string | null;
};

type AgentLike = {
  id: string;
  name: string;
  adapterConfig: Record<string, unknown>;
};

type EnvInputRecord = {
  kind: "secret" | "plain";
  requirement: "required" | "optional";
  default?: string | null;
  description?: string | null;
  portability?: "portable" | "system_dependent";
};

const COMPANY_LOGO_CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
};

const COMPANY_LOGO_FILE_NAME = "company-logo";

const RUNTIME_DEFAULT_RULES: Array<{ path: string[]; value: unknown }> = [
  { path: ["heartbeat", "cooldownSec"], value: 10 },
  { path: ["heartbeat", "intervalSec"], value: 3600 },
  { path: ["heartbeat", "wakeOnOnDemand"], value: true },
  { path: ["heartbeat", "wakeOnAssignment"], value: true },
  { path: ["heartbeat", "wakeOnAutomation"], value: true },
  { path: ["heartbeat", "wakeOnDemand"], value: true },
  { path: ["heartbeat", "maxConcurrentRuns"], value: AGENT_DEFAULT_MAX_CONCURRENT_RUNS },
];

const ADAPTER_DEFAULT_RULES_BY_TYPE: Record<string, Array<{ path: string[]; value: unknown }>> = {
  codex_local: [
    { path: ["timeoutSec"], value: 0 },
    { path: ["graceSec"], value: 15 },
  ],
  gemini_local: [
    { path: ["timeoutSec"], value: 0 },
    { path: ["graceSec"], value: 15 },
  ],
  opencode_local: [
    { path: ["timeoutSec"], value: 0 },
    { path: ["graceSec"], value: 15 },
  ],
  cursor: [
    { path: ["timeoutSec"], value: 0 },
    { path: ["graceSec"], value: 15 },
  ],
  claude_local: [
    { path: ["timeoutSec"], value: 0 },
    { path: ["graceSec"], value: 15 },
    { path: ["maxTurnsPerRun"], value: 1000 },
  ],
  openclaw_gateway: [
    { path: ["timeoutSec"], value: 120 },
    { path: ["waitTimeoutMs"], value: 120000 },
    { path: ["sessionKeyStrategy"], value: "fixed" },
    { path: ["sessionKey"], value: "paperclip" },
    { path: ["role"], value: "operator" },
    { path: ["scopes"], value: ["operator.admin"] },
  ],
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

type PortableAgentPermissionGrant = CompanyPortabilityAgentManifestEntry["permissionGrants"][number];

const VALID_PERMISSION_KEYS = new Set<PermissionKey>(PERMISSION_KEYS);

function normalizePortablePermissionGrants(value: unknown): PortableAgentPermissionGrant[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): PortableAgentPermissionGrant[] => {
    if (!isPlainRecord(entry)) return [];
    const permissionKey = asString(entry.permissionKey);
    if (!permissionKey || !VALID_PERMISSION_KEYS.has(permissionKey as PermissionKey)) return [];
    return [{
      permissionKey: permissionKey as PermissionKey,
      scope: isPlainRecord(entry.scope) ? entry.scope : null,
    }];
  });
}

function asInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const entries = value.filter((entry): entry is string => typeof entry === "string");
  return entries.length === value.length ? entries : null;
}

function derivePortableCommentAuthorType(value: Record<string, unknown>) {
  const explicit = issueCommentAuthorTypeSchema.safeParse(value.authorType);
  if (explicit.success) return explicit.data;
  return asString(value.authorAgentSlug) ? "agent" : asString(value.authorUserId) ? "user" : "system";
}

function readPortableIssueComments(
  value: unknown,
  warnings: string[],
  sourceLabel: string,
): CompanyPortabilityIssueCommentManifestEntry[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    warnings.push(`${sourceLabel} comments were ignored because they are not an array.`);
    return [];
  }

  const comments: CompanyPortabilityIssueCommentManifestEntry[] = [];
  for (const [index, entry] of value.entries()) {
    if (!isPlainRecord(entry)) {
      warnings.push(`${sourceLabel} comment ${index + 1} was ignored because it is not an object.`);
      continue;
    }
    const body = asString(entry.body);
    if (!body) {
      warnings.push(`${sourceLabel} comment ${index + 1} was ignored because it has no body.`);
      continue;
    }
    const presentation = entry.presentation == null ? null : issueCommentPresentationSchema.safeParse(entry.presentation);
    if (presentation && !presentation.success) {
      warnings.push(`${sourceLabel} comment ${index + 1} has invalid presentation metadata and was ignored.`);
      continue;
    }
    const metadata = entry.metadata == null ? null : issueCommentMetadataSchema.safeParse(entry.metadata);
    if (metadata && !metadata.success) {
      warnings.push(`${sourceLabel} comment ${index + 1} has invalid hidden metadata and was ignored.`);
      continue;
    }
    const createdAt = asString(entry.createdAt);
    comments.push({
      body,
      authorType: derivePortableCommentAuthorType(entry),
      authorAgentSlug: asString(entry.authorAgentSlug),
      authorUserId: asString(entry.authorUserId),
      presentation: presentation ? presentation.data : null,
      metadata: metadata ? metadata.data : null,
      createdAt: createdAt && Number.isNaN(Date.parse(createdAt)) ? null : createdAt,
    });
  }
  return comments;
}

function appendCodexImportArg(adapterConfig: Record<string, unknown>, arg: string) {
  const extraArgs = readStringArray(adapterConfig.extraArgs);
  if (extraArgs) {
    if (!extraArgs.includes(arg)) adapterConfig.extraArgs = [...extraArgs, arg];
    return;
  }

  const legacyArgs = readStringArray(adapterConfig.args);
  if (legacyArgs && legacyArgs.length > 0) {
    if (!legacyArgs.includes(arg)) adapterConfig.args = [...legacyArgs, arg];
    return;
  }

  if (legacyArgs?.includes(arg)) return;
  adapterConfig.extraArgs = [arg];
}

function applyImportAdapterRunDefaults(
  adapterType: string,
  adapterConfig: Record<string, unknown>,
) {
  const next = { ...adapterConfig };
  if (adapterType === "codex_local") {
    appendCodexImportArg(next, "--skip-git-repo-check");
  }
  return next;
}

function normalizeRoutineTriggerExtension(value: unknown): CompanyPortabilityIssueRoutineTriggerManifestEntry | null {
  if (!isPlainRecord(value)) return null;
  const kind = asString(value.kind);
  if (!kind) return null;
    kind,
    label: asString(value.label),
    enabled: asBoolean(value.enabled) ?? true,
    cronExpression: asString(value.cronExpression),
    timezone: asString(value.timezone),
    signingMode: asString(value.signingMode),
    replayWindowSec: asInteger(value.replayWindowSec),
  };
}

function normalizeRoutineVariableExtension(value: unknown): RoutineVariable | null {
  if (!isPlainRecord(value)) return null;
  const name = asString(value.name);
  if (!name) return null;
  const type = asString(value.type) ?? "text";
  if (!["text", "textarea", "number", "boolean", "select"].includes(type)) return null;
  const options = Array.isArray(value.options)
    ? value.options.map((entry) => asString(entry)).filter((entry): entry is string => Boolean(entry))
    : [];
  const defaultValue =
    typeof value.defaultValue === "string" || typeof value.defaultValue === "number" || typeof value.defaultValue === "boolean"
      ? value.defaultValue
      : null;
    name,
    label: asString(value.label),
    type: type as RoutineVariable["type"],
    defaultValue,
    required: asBoolean(value.required) ?? true,
    options,
  };
}

function normalizeRoutineExtension(value: unknown): CompanyPortabilityIssueRoutineManifestEntry | null {
  if (!isPlainRecord(value)) return null;
  const triggers = Array.isArray(value.triggers)
    ? value.triggers
      .map((entry) => normalizeRoutineTriggerExtension(entry))
      .filter((entry): entry is CompanyPortabilityIssueRoutineTriggerManifestEntry => entry !== null)
    : [];
  const variables = Array.isArray(value.variables)
    ? value.variables
      .map((entry) => normalizeRoutineVariableExtension(entry))
      .filter((entry): entry is RoutineVariable => entry !== null)
    : null;
  const routine = {
    concurrencyPolicy: asString(value.concurrencyPolicy),
    catchUpPolicy: asString(value.catchUpPolicy),
    variables,
    triggers,
  };
  return stripEmptyValues(routine) ? routine : null;
}

function buildRoutineManifestFromLiveRoutine(routine: RoutineLike): CompanyPortabilityIssueRoutineManifestEntry {
    concurrencyPolicy: routine.concurrencyPolicy,
    catchUpPolicy: routine.catchUpPolicy,
    variables: routine.variables,
    triggers: routine.triggers.map((trigger) => ({
      kind: trigger.kind,
      label: trigger.label ?? null,
      enabled: Boolean(trigger.enabled),
      cronExpression: trigger.kind === "schedule" ? trigger.cronExpression ?? null : null,
      timezone: trigger.kind === "schedule" ? trigger.timezone ?? null : null,
      signingMode: trigger.kind === "webhook" ? trigger.signingMode ?? null : null,
      replayWindowSec: trigger.kind === "webhook" ? trigger.replayWindowSec ?? null : null,
    })),
  };
}

function containsAbsolutePathFragment(value: string) {
  return /(^|\s)(\/[^/\s]|[A-Za-z]:[\\/])/.test(value);
}

function containsSystemDependentPathValue(value: unknown): boolean {
  if (typeof value === "string") {
    return path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value) || containsAbsolutePathFragment(value);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsSystemDependentPathValue(entry));
  }
  if (isPlainRecord(value)) {
    return Object.values(value).some((entry) => containsSystemDependentPathValue(entry));
  }
  return false;
}

function clonePortableRecord(value: unknown) {
  if (!isPlainRecord(value)) return null;
  return structuredClone(value) as Record<string, unknown>;
}

function parseFiniteNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function disableImportedTimerHeartbeat(runtimeConfig: unknown) {
  const next = clonePortableRecord(runtimeConfig) ?? {};
  const heartbeat = isPlainRecord(next.heartbeat) ? { ...next.heartbeat } : {};
  heartbeat.enabled = false;
  if (parseFiniteNumberLike(heartbeat.maxConcurrentRuns) == null) {
    heartbeat.maxConcurrentRuns = AGENT_DEFAULT_MAX_CONCURRENT_RUNS;
  }
  next.heartbeat = heartbeat;
  return next;
}

function normalizePortableProjectWorkspaceExtension(
  workspaceKey: string,
  value: unknown,
): CompanyPortabilityProjectWorkspaceManifestEntry | null {
  if (!isPlainRecord(value)) return null;
  const normalizedKey = normalizeAgentUrlKey(workspaceKey) ?? workspaceKey.trim();
  if (!normalizedKey) return null;
    key: normalizedKey,
    name: asString(value.name) ?? normalizedKey,
    sourceType: asString(value.sourceType),
    repoUrl: asString(value.repoUrl),
    repoRef: asString(value.repoRef),
    defaultRef: asString(value.defaultRef),
    visibility: asString(value.visibility),
    setupCommand: asString(value.setupCommand),
    cleanupCommand: asString(value.cleanupCommand),
    metadata: isPlainRecord(value.metadata) ? value.metadata : null,
    isPrimary: asBoolean(value.isPrimary) ?? false,
  };
}

function derivePortableProjectWorkspaceKey(
  workspace: NonNullable<ProjectLike["workspaces"]>[number],
  usedKeys: Set<string>,
) {
  const baseKey =
    normalizeAgentUrlKey(workspace.name)
    ?? normalizeAgentUrlKey(asString(workspace.repoUrl)?.split("/").pop()?.replace(/\.git$/i, "") ?? "")
    ?? "workspace";
  return uniqueSlug(baseKey, usedKeys);
}

function exportPortableProjectExecutionWorkspacePolicy(
  projectSlug: string,
  policy: unknown,
  workspaceKeyById: Map<string, string>,
  warnings: string[],
) {
  const next = clonePortableRecord(policy);
  if (!next) return null;
  const defaultWorkspaceId = asString(next.defaultProjectWorkspaceId);
  if (defaultWorkspaceId) {
    const defaultWorkspaceKey = workspaceKeyById.get(defaultWorkspaceId);
    if (defaultWorkspaceKey) {
      next.defaultProjectWorkspaceKey = defaultWorkspaceKey;
    } else {
      warnings.push(`Project ${projectSlug} default workspace ${defaultWorkspaceId} was omitted from export because that workspace is not portable.`);
    }
    delete next.defaultProjectWorkspaceId;
  }
  const cleaned = stripEmptyValues(next);
  return isPlainRecord(cleaned) ? cleaned : null;
}

function importPortableProjectExecutionWorkspacePolicy(
  projectSlug: string,
  policy: Record<string, unknown> | null | undefined,
  workspaceIdByKey: Map<string, string>,
  warnings: string[],
) {
  const next = clonePortableRecord(policy);
  if (!next) return null;
  const defaultWorkspaceKey = asString(next.defaultProjectWorkspaceKey);
  if (defaultWorkspaceKey) {
    const defaultWorkspaceId = workspaceIdByKey.get(defaultWorkspaceKey);
    if (defaultWorkspaceId) {
      next.defaultProjectWorkspaceId = defaultWorkspaceId;
    } else {
      warnings.push(`Project ${projectSlug} references missing workspace key ${defaultWorkspaceKey}; imported execution workspace policy without a default workspace.`);
    }
  }
  delete next.defaultProjectWorkspaceKey;
  const cleaned = stripEmptyValues(next);
  return isPlainRecord(cleaned) ? cleaned : null;
}

function stripPortableProjectExecutionWorkspaceRefs(policy: Record<string, unknown> | null | undefined) {
  const next = clonePortableRecord(policy);
  if (!next) return null;
  delete next.defaultProjectWorkspaceId;
  delete next.defaultProjectWorkspaceKey;
  const cleaned = stripEmptyValues(next);
  return isPlainRecord(cleaned) ? cleaned : null;
}

async function readGitOutput(cwd: string, args: string[]) {
  const { stdout } = await execFileAsync("git", ["-C", cwd, ...args], { cwd });
  const trimmed = stdout.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function inferPortableWorkspaceGitMetadata(workspace: NonNullable<ProjectLike["workspaces"]>[number]) {
  const cwd = asString(workspace.cwd);
  if (!cwd) {
    return {
      repoUrl: null,
      repoRef: null,
      defaultRef: null,
    };
  }

  let repoUrl: string | null = null;
  try {
    repoUrl = await readGitOutput(cwd, ["remote", "get-url", "origin"]);
  } catch {
    try {
      const firstRemote = await readGitOutput(cwd, ["remote"]);
      const remoteName = firstRemote?.split("\n").map((entry) => entry.trim()).find(Boolean) ?? null;
      if (remoteName) {
        repoUrl = await readGitOutput(cwd, ["remote", "get-url", remoteName]);
      }
    } catch {
      repoUrl = null;
    }
  }

  let repoRef: string | null = null;
  try {
    repoRef = await readGitOutput(cwd, ["branch", "--show-current"]);
  } catch {
    repoRef = null;
  }

  let defaultRef: string | null = null;
  try {
    const remoteHead = await readGitOutput(cwd, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]);
    defaultRef = remoteHead?.startsWith("origin/") ? remoteHead.slice("origin/".length) : remoteHead;
  } catch {
    defaultRef = null;
  }

    repoUrl,
    repoRef,
    defaultRef,
  };
}

async function buildPortableProjectWorkspaces(
  projectSlug: string,
  workspaces: ProjectLike["workspaces"] | undefined,
  warnings: string[],
) {
  const exportedWorkspaces: Record<string, Record<string, unknown>> = {};
  const manifestWorkspaces: CompanyPortabilityProjectWorkspaceManifestEntry[] = [];
  const workspaceKeyById = new Map<string, string>();
  const workspaceKeyBySignature = new Map<string, string>();
  const manifestWorkspaceByKey = new Map<string, CompanyPortabilityProjectWorkspaceManifestEntry>();
  const usedKeys = new Set<string>();

  for (const workspace of workspaces ?? []) {
    const inferredGitMetadata =
      !asString(workspace.repoUrl) || !asString(workspace.repoRef) || !asString(workspace.defaultRef)
        ? await inferPortableWorkspaceGitMetadata(workspace)
        : { repoUrl: null, repoRef: null, defaultRef: null };
    const repoUrl = asString(workspace.repoUrl) ?? inferredGitMetadata.repoUrl;
    if (!repoUrl) {
      warnings.push(`Project ${projectSlug} workspace ${workspace.name} was omitted from export because it does not have a portable repoUrl.`);
      continue;
    }
    const repoRef = asString(workspace.repoRef) ?? inferredGitMetadata.repoRef;
    const defaultRef = asString(workspace.defaultRef) ?? inferredGitMetadata.defaultRef ?? repoRef;
    const workspaceSignature = JSON.stringify({
      name: workspace.name,
      repoUrl,
      repoRef,
      defaultRef,
    });
    const existingWorkspaceKey = workspaceKeyBySignature.get(workspaceSignature);
    if (existingWorkspaceKey) {
      workspaceKeyById.set(workspace.id, existingWorkspaceKey);
      const existingManifestWorkspace = manifestWorkspaceByKey.get(existingWorkspaceKey);
      if (existingManifestWorkspace && workspace.isPrimary) {
        existingManifestWorkspace.isPrimary = true;
        const existingExtensionWorkspace = exportedWorkspaces[existingWorkspaceKey];
        if (isPlainRecord(existingExtensionWorkspace)) existingExtensionWorkspace.isPrimary = true;
      }
      continue;
    }

    const workspaceKey = derivePortableProjectWorkspaceKey(workspace, usedKeys);
    workspaceKeyById.set(workspace.id, workspaceKey);
    workspaceKeyBySignature.set(workspaceSignature, workspaceKey);

    let setupCommand = asString(workspace.setupCommand);
    if (setupCommand && containsAbsolutePathFragment(setupCommand)) {
      warnings.push(`Project ${projectSlug} workspace ${workspaceKey} setupCommand was omitted from export because it is system-dependent.`);
      setupCommand = null;
    }

    let cleanupCommand = asString(workspace.cleanupCommand);
    if (cleanupCommand && containsAbsolutePathFragment(cleanupCommand)) {
      warnings.push(`Project ${projectSlug} workspace ${workspaceKey} cleanupCommand was omitted from export because it is system-dependent.`);
      cleanupCommand = null;
    }

    const metadata = isPlainRecord(workspace.metadata) && !containsSystemDependentPathValue(workspace.metadata)
      ? workspace.metadata
      : null;
    if (isPlainRecord(workspace.metadata) && metadata == null) {
      warnings.push(`Project ${projectSlug} workspace ${workspaceKey} metadata was omitted from export because it contains system-dependent paths.`);
    }

    const portableWorkspace = stripEmptyValues({
      name: workspace.name,
      sourceType: workspace.sourceType,
      repoUrl,
      repoRef,
      defaultRef,
      visibility: asString(workspace.visibility),
      setupCommand,
      cleanupCommand,
      metadata,
      isPrimary: workspace.isPrimary ? true : undefined,
    });
    if (!isPlainRecord(portableWorkspace)) continue;

    exportedWorkspaces[workspaceKey] = portableWorkspace;
    const manifestWorkspace = {
      key: workspaceKey,
      name: workspace.name,
      sourceType: asString(workspace.sourceType),
      repoUrl,
      repoRef,
      defaultRef,
      visibility: asString(workspace.visibility),
      setupCommand,
      cleanupCommand,
      metadata,
      isPrimary: workspace.isPrimary,
    };
    manifestWorkspaces.push(manifestWorkspace);
    manifestWorkspaceByKey.set(workspaceKey, manifestWorkspace);
  }

    extension: Object.keys(exportedWorkspaces).length > 0 ? exportedWorkspaces : undefined,
    manifest: manifestWorkspaces,
    workspaceKeyById,
  };
}

const WEEKDAY_TO_CRON: Record<string, string> = {
  sunday: "0",
  monday: "1",
  tuesday: "2",
  wednesday: "3",
  thursday: "4",
  friday: "5",
  saturday: "6",
};

function readZonedDateParts(startsAt: string, timeZone: string) {
  try {
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) return null;
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      weekday: "long",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
    const parts = Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter((entry) => entry.type !== "literal")
        .map((entry) => [entry.type, entry.value]),
    ) as Record<string, string>;
    const weekday = WEEKDAY_TO_CRON[parts.weekday?.toLowerCase() ?? ""];
    const month = Number(parts.month);
    const day = Number(parts.day);
    const hour = Number(parts.hour);
    const minute = Number(parts.minute);
    if (!weekday || !Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }
    return { weekday, month, day, hour, minute };
  } catch {
    return null;
  }
}

function normalizeCronList(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => Number(left) - Number(right)).join(",");
}

function buildLegacyRoutineTriggerFromRecurrence(
  issue: Pick<CompanyPortabilityIssueManifestEntry, "slug" | "legacyRecurrence">,
  scheduleValue: unknown,
) {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!issue.legacyRecurrence || !isPlainRecord(issue.legacyRecurrence)) {
    return { trigger: null, warnings, errors };
  }

  const schedule = isPlainRecord(scheduleValue) ? scheduleValue : null;
  const frequency = asString(issue.legacyRecurrence.frequency);
  const interval = asInteger(issue.legacyRecurrence.interval) ?? 1;
  if (!frequency) {
    errors.push(`Recurring task ${issue.slug} uses legacy recurrence without frequency; add .paperclip.yaml routines.${issue.slug}.triggers.`);
    return { trigger: null, warnings, errors };
  }
  if (interval < 1) {
    errors.push(`Recurring task ${issue.slug} uses legacy recurrence with an invalid interval; add .paperclip.yaml routines.${issue.slug}.triggers.`);
    return { trigger: null, warnings, errors };
  }

  const timezone = asString(schedule?.timezone) ?? "UTC";
  const startsAt = asString(schedule?.startsAt);
  const zonedStartsAt = startsAt ? readZonedDateParts(startsAt, timezone) : null;
  if (startsAt && !zonedStartsAt) {
    errors.push(`Recurring task ${issue.slug} has an invalid legacy startsAt/timezone combination; add .paperclip.yaml routines.${issue.slug}.triggers.`);
    return { trigger: null, warnings, errors };
  }

  const time = isPlainRecord(issue.legacyRecurrence.time) ? issue.legacyRecurrence.time : null;
  const hour = asInteger(time?.hour) ?? zonedStartsAt?.hour ?? 0;
  const minute = asInteger(time?.minute) ?? zonedStartsAt?.minute ?? 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    errors.push(`Recurring task ${issue.slug} uses legacy recurrence with an invalid time; add .paperclip.yaml routines.${issue.slug}.triggers.`);
    return { trigger: null, warnings, errors };
  }

  if (issue.legacyRecurrence.until != null || issue.legacyRecurrence.count != null) {
    warnings.push(`Recurring task ${issue.slug} uses legacy recurrence end bounds; Paperclip will import the routine trigger without those limits.`);
  }

  let cronExpression: string | null = null;

  if (frequency === "hourly") {
    const hourField = interval === 1
      ? "*"
      : zonedStartsAt
        ? `${zonedStartsAt.hour}-23/${interval}`
        : `*/${interval}`;
    cronExpression = `${minute} ${hourField} * * *`;
  } else if (frequency === "daily") {
    if (Array.isArray(issue.legacyRecurrence.weekdays) || Array.isArray(issue.legacyRecurrence.monthDays) || Array.isArray(issue.legacyRecurrence.months)) {
      errors.push(`Recurring task ${issue.slug} uses unsupported legacy daily recurrence constraints; add .paperclip.yaml routines.${issue.slug}.triggers.`);
      return { trigger: null, warnings, errors };
    }
    const dayField = interval === 1 ? "*" : `*/${interval}`;
    cronExpression = `${minute} ${hour} ${dayField} * *`;
  } else if (frequency === "weekly") {
    if (interval !== 1) {
      errors.push(`Recurring task ${issue.slug} uses legacy weekly recurrence with interval > 1; add .paperclip.yaml routines.${issue.slug}.triggers.`);
      return { trigger: null, warnings, errors };
    }
    const weekdays = Array.isArray(issue.legacyRecurrence.weekdays)
      ? issue.legacyRecurrence.weekdays
        .map((entry) => asString(entry))
        .filter((entry): entry is string => Boolean(entry))
      : [];
    const cronWeekdays = weekdays
      .map((entry) => WEEKDAY_TO_CRON[entry.toLowerCase()])
      .filter((entry): entry is string => Boolean(entry));
    if (cronWeekdays.length === 0 && zonedStartsAt?.weekday) {
      cronWeekdays.push(zonedStartsAt.weekday);
    }
    if (cronWeekdays.length === 0) {
      errors.push(`Recurring task ${issue.slug} uses legacy weekly recurrence without weekdays; add .paperclip.yaml routines.${issue.slug}.triggers.`);
      return { trigger: null, warnings, errors };
    }
    cronExpression = `${minute} ${hour} * * ${normalizeCronList(cronWeekdays)}`;
  } else if (frequency === "monthly") {
    if (interval !== 1) {
      errors.push(`Recurring task ${issue.slug} uses legacy monthly recurrence with interval > 1; add .paperclip.yaml routines.${issue.slug}.triggers.`);
      return { trigger: null, warnings, errors };
    }
    if (Array.isArray(issue.legacyRecurrence.ordinalWeekdays) && issue.legacyRecurrence.ordinalWeekdays.length > 0) {
      errors.push(`Recurring task ${issue.slug} uses legacy ordinal monthly recurrence; add .paperclip.yaml routines.${issue.slug}.triggers.`);
      return { trigger: null, warnings, errors };
    }
    const monthDays = Array.isArray(issue.legacyRecurrence.monthDays)
      ? issue.legacyRecurrence.monthDays
        .map((entry) => asInteger(entry))
        .filter((entry): entry is number => entry != null && entry >= 1 && entry <= 31)
      : [];
    if (monthDays.length === 0 && zonedStartsAt?.day) {
      monthDays.push(zonedStartsAt.day);
    }
    if (monthDays.length === 0) {
      errors.push(`Recurring task ${issue.slug} uses legacy monthly recurrence without monthDays; add .paperclip.yaml routines.${issue.slug}.triggers.`);
      return { trigger: null, warnings, errors };
    }
    const months = Array.isArray(issue.legacyRecurrence.months)
      ? issue.legacyRecurrence.months
        .map((entry) => asInteger(entry))
        .filter((entry): entry is number => entry != null && entry >= 1 && entry <= 12)
      : [];
    const monthField = months.length > 0 ? normalizeCronList(months.map(String)) : "*";
    cronExpression = `${minute} ${hour} ${normalizeCronList(monthDays.map(String))} ${monthField} *`;
  } else if (frequency === "yearly") {
    if (interval !== 1) {
      errors.push(`Recurring task ${issue.slug} uses legacy yearly recurrence with interval > 1; add .paperclip.yaml routines.${issue.slug}.triggers.`);
      return { trigger: null, warnings, errors };
    }
    const months = Array.isArray(issue.legacyRecurrence.months)
      ? issue.legacyRecurrence.months
        .map((entry) => asInteger(entry))
        .filter((entry): entry is number => entry != null && entry >= 1 && entry <= 12)
      : [];
    if (months.length === 0 && zonedStartsAt?.month) {
      months.push(zonedStartsAt.month);
    }
    const monthDays = Array.isArray(issue.legacyRecurrence.monthDays)
      ? issue.legacyRecurrence.monthDays
        .map((entry) => asInteger(entry))
        .filter((entry): entry is number => entry != null && entry >= 1 && entry <= 31)
      : [];
    if (monthDays.length === 0 && zonedStartsAt?.day) {
      monthDays.push(zonedStartsAt.day);
    }
    if (months.length === 0 || monthDays.length === 0) {
      errors.push(`Recurring task ${issue.slug} uses legacy yearly recurrence without month/monthDay anchors; add .paperclip.yaml routines.${issue.slug}.triggers.`);
      return { trigger: null, warnings, errors };
    }
    cronExpression = `${minute} ${hour} ${normalizeCronList(monthDays.map(String))} ${normalizeCronList(months.map(String))} *`;
  } else {
    errors.push(`Recurring task ${issue.slug} uses unsupported legacy recurrence frequency "${frequency}"; add .paperclip.yaml routines.${issue.slug}.triggers.`);
    return { trigger: null, warnings, errors };
  }

    trigger: {
      kind: "schedule",
      label: "Migrated legacy recurrence",
      enabled: true,
      cronExpression,
      timezone,
      signingMode: null,
      replayWindowSec: null,
    } satisfies CompanyPortabilityIssueRoutineTriggerManifestEntry,
    warnings,
    errors,
  };
}

function resolvePortableRoutineDefinition(
  issue: Pick<CompanyPortabilityIssueManifestEntry, "slug" | "recurring" | "routine" | "legacyRecurrence">,
  scheduleValue: unknown,
) {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!issue.recurring) {
    return { routine: null, warnings, errors };
  }

  const routine = issue.routine
    ? {
      concurrencyPolicy: issue.routine.concurrencyPolicy,
      catchUpPolicy: issue.routine.catchUpPolicy,
      variables: issue.routine.variables ?? null,
      triggers: [...issue.routine.triggers],
    }
    : {
      concurrencyPolicy: null,
      catchUpPolicy: null,
      variables: null,
      triggers: [] as CompanyPortabilityIssueRoutineTriggerManifestEntry[],
    };

  if (routine.concurrencyPolicy && !ROUTINE_CONCURRENCY_POLICIES.includes(routine.concurrencyPolicy as any)) {
    errors.push(`Recurring task ${issue.slug} uses unsupported routine concurrencyPolicy "${routine.concurrencyPolicy}".`);
  }
  if (routine.catchUpPolicy && !ROUTINE_CATCH_UP_POLICIES.includes(routine.catchUpPolicy as any)) {
    errors.push(`Recurring task ${issue.slug} uses unsupported routine catchUpPolicy "${routine.catchUpPolicy}".`);
  }

  for (const trigger of routine.triggers) {
    if (!ROUTINE_TRIGGER_KINDS.includes(trigger.kind as any)) {
      errors.push(`Recurring task ${issue.slug} uses unsupported trigger kind "${trigger.kind}".`);
      continue;
    }
    if (trigger.kind === "schedule") {
      if (!trigger.cronExpression || !trigger.timezone) {
        errors.push(`Recurring task ${issue.slug} has a schedule trigger missing cronExpression/timezone.`);
        continue;
      }
      const cronError = validateCron(trigger.cronExpression);
      if (cronError) {
        errors.push(`Recurring task ${issue.slug} has an invalid schedule trigger: ${cronError}`);
      }
      continue;
    }
    if (trigger.kind === "webhook" && trigger.signingMode && !ROUTINE_TRIGGER_SIGNING_MODES.includes(trigger.signingMode as any)) {
      errors.push(`Recurring task ${issue.slug} uses unsupported webhook signingMode "${trigger.signingMode}".`);
    }
  }

  if (routine.triggers.length === 0 && issue.legacyRecurrence) {
    const migrated = buildLegacyRoutineTriggerFromRecurrence(issue, scheduleValue);
    warnings.push(...migrated.warnings);
    errors.push(...migrated.errors);
    if (migrated.trigger) {
      routine.triggers.push(migrated.trigger);
    }
  }

  return { routine, warnings, errors };
}

function toSafeSlug(input: string, fallback: string) {
  return normalizeAgentUrlKey(input) ?? fallback;
}

function uniqueSlug(base: string, used: Set<string>) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let idx = 2;
  while (true) {
    const candidate = `${base}-${idx}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    idx += 1;
  }
}

function uniqueNameBySlug(baseName: string, existingSlugs: Set<string>) {
  const baseSlug = normalizeAgentUrlKey(baseName) ?? "agent";
  if (!existingSlugs.has(baseSlug)) return baseName;
  let idx = 2;
  while (true) {
    const candidateName = `${baseName} ${idx}`;
    const candidateSlug = normalizeAgentUrlKey(candidateName) ?? `agent-${idx}`;
    if (!existingSlugs.has(candidateSlug)) return candidateName;
    idx += 1;
  }
}

function uniqueProjectName(baseName: string, existingProjectSlugs: Set<string>) {
  const baseSlug = deriveProjectUrlKey(baseName, baseName);
  if (!existingProjectSlugs.has(baseSlug)) return baseName;
  let idx = 2;
  while (true) {
    const candidateName = `${baseName} ${idx}`;
    const candidateSlug = deriveProjectUrlKey(candidateName, candidateName);
    if (!existingProjectSlugs.has(candidateSlug)) return candidateName;
    idx += 1;
  }
}

function normalizeInclude(input?: Partial<CompanyPortabilityInclude>): CompanyPortabilityInclude {
    company: input?.company ?? DEFAULT_INCLUDE.company,
    agents: input?.agents ?? DEFAULT_INCLUDE.agents,
    projects: input?.projects ?? DEFAULT_INCLUDE.projects,
    issues: input?.issues ?? DEFAULT_INCLUDE.issues,
    skills: input?.skills ?? DEFAULT_INCLUDE.skills,
  };
}

function resolvePortablePath(fromPath: string, targetPath: string) {
  const baseDir = path.posix.dirname(fromPath.replace(/\\/g, "/"));
  return normalizePortablePath(path.posix.join(baseDir, targetPath.replace(/\\/g, "/")));
}

function isPortableBinaryFile(
  value: CompanyPortabilityFileEntry,
): value is Extract<CompanyPortabilityFileEntry, { encoding: "base64" }> {
  return typeof value === "object" && value !== null && value.encoding === "base64" && typeof value.data === "string";
}

function readPortableTextFile(
  files: Record<string, CompanyPortabilityFileEntry>,
  filePath: string,
) {
  const value = files[filePath];
  return typeof value === "string" ? value : null;
}

function inferContentTypeFromPath(filePath: string) {
  const extension = path.posix.extname(filePath).toLowerCase();
  switch (extension) {
    case ".gif":
      return "image/gif";
    case ".jpeg":
    case ".jpg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return null;
  }
}

function resolveCompanyLogoExtension(contentType: string | null | undefined, originalFilename: string | null | undefined) {
  const fromContentType = contentType ? COMPANY_LOGO_CONTENT_TYPE_EXTENSIONS[contentType.toLowerCase()] : null;
  if (fromContentType) return fromContentType;

  const extension = originalFilename ? path.extname(originalFilename).toLowerCase() : "";
  return extension || ".png";
}

function portableBinaryFileToBuffer(entry: Extract<CompanyPortabilityFileEntry, { encoding: "base64" }>) {
  return Buffer.from(entry.data, "base64");
}

function portableFileToBuffer(entry: CompanyPortabilityFileEntry, filePath: string) {
  if (typeof entry === "string") {
    return Buffer.from(entry, "utf8");
  }
  if (isPortableBinaryFile(entry)) {
    return portableBinaryFileToBuffer(entry);
  }
  throw unprocessable(`Unsupported file entry encoding for ${filePath}`);
}

function bufferToPortableBinaryFile(buffer: Buffer, contentType: string | null): CompanyPortabilityFileEntry {
    encoding: "base64",
    data: buffer.toString("base64"),
    contentType,
  };
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function normalizeFileMap(
  files: Record<string, CompanyPortabilityFileEntry>,
  rootPath?: string | null,
): Record<string, CompanyPortabilityFileEntry> {
  const normalizedRoot = rootPath ? normalizePortablePath(rootPath) : null;
  const out: Record<string, CompanyPortabilityFileEntry> = {};
  for (const [rawPath, content] of Object.entries(files)) {
    let nextPath = normalizePortablePath(rawPath);
    if (normalizedRoot && nextPath === normalizedRoot) {
      continue;
    }
    if (normalizedRoot && nextPath.startsWith(`${normalizedRoot}/`)) {
      nextPath = nextPath.slice(normalizedRoot.length + 1);
    }
    if (!nextPath) continue;
    out[nextPath] = content;
  }
  return out;
}

function pickTextFiles(files: Record<string, CompanyPortabilityFileEntry>) {
  const out: Record<string, string> = {};
  for (const [filePath, content] of Object.entries(files)) {
    if (typeof content === "string") {
      out[filePath] = content;
    }
  }
  return out;
}

function collectSelectedExportSlugs(selectedFiles: Set<string>) {
  const agents = new Set<string>();
  const projects = new Set<string>();
  const tasks = new Set<string>();
  for (const filePath of selectedFiles) {
    const agentMatch = filePath.match(/^agents\/([^/]+)\//);
    if (agentMatch) agents.add(agentMatch[1]!);
    const projectMatch = filePath.match(/^projects\/([^/]+)\//);
    if (projectMatch) projects.add(projectMatch[1]!);
    const taskMatch = filePath.match(/^tasks\/([^/]+)\//);
    if (taskMatch) tasks.add(taskMatch[1]!);
  }
  return { agents, projects, tasks, routines: new Set(tasks) };
}

function normalizePortableSlugList(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
}

function normalizePortableSidebarOrder(value: unknown): CompanyPortabilitySidebarOrder | null {
  if (!isPlainRecord(value)) return null;
  const sidebar = {
    agents: normalizePortableSlugList(value.agents),
    projects: normalizePortableSlugList(value.projects),
  };
  return sidebar.agents.length > 0 || sidebar.projects.length > 0 ? sidebar : null;
}

function sortAgentsBySidebarOrder<T extends { id: string; name: string; reportsTo: string | null }>(agents: T[]) {
  if (agents.length === 0) return [];

  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  const childrenOf = new Map<string | null, T[]>();
  for (const agent of agents) {
    const parentId = agent.reportsTo && byId.has(agent.reportsTo) ? agent.reportsTo : null;
    const siblings = childrenOf.get(parentId) ?? [];
    siblings.push(agent);
    childrenOf.set(parentId, siblings);
  }

  for (const siblings of childrenOf.values()) {
    siblings.sort((left, right) => left.name.localeCompare(right.name));
  }

  const sorted: T[] = [];
  const queue = [...(childrenOf.get(null) ?? [])];
  while (queue.length > 0) {
    const agent = queue.shift();
    if (!agent) continue;
    sorted.push(agent);
    const children = childrenOf.get(agent.id);
    if (children) queue.push(...children);
  }

  return sorted;
}

function filterPortableExtensionYaml(yaml: string, selectedFiles: Set<string>) {
  const selected = collectSelectedExportSlugs(selectedFiles);
  const parsed = parseYamlFile(yaml);
  for (const section of ["agents", "projects", "tasks", "routines"] as const) {
    const sectionValue = parsed[section];
    if (!isPlainRecord(sectionValue)) continue;
    const sectionSlugs = selected[section];
    const filteredEntries = Object.fromEntries(
      Object.entries(sectionValue).filter(([slug]) => sectionSlugs.has(slug)),
    );
    if (Object.keys(filteredEntries).length > 0) {
      parsed[section] = filteredEntries;
    } else {
      delete parsed[section];
    }
  }

  const companySection = parsed.company;
  if (isPlainRecord(companySection)) {
    const logoPath = asString(companySection.logoPath) ?? asString(companySection.logo);
    if (logoPath && !selectedFiles.has(logoPath)) {
      delete companySection.logoPath;
      delete companySection.logo;
    }
  }

  const sidebarOrder = normalizePortableSidebarOrder(parsed.sidebar);
  if (sidebarOrder) {
    const filteredSidebar = stripEmptyValues({
      agents: sidebarOrder.agents.filter((slug) => selected.agents.has(slug)),
      projects: sidebarOrder.projects.filter((slug) => selected.projects.has(slug)),
    });
    if (isPlainRecord(filteredSidebar)) {
      parsed.sidebar = filteredSidebar;
    } else {
      delete parsed.sidebar;
    }
  } else {
    delete parsed.sidebar;
  }

  return buildYamlFile(parsed, { preserveEmptyStrings: true });
}

function filterExportFiles(
  files: Record<string, CompanyPortabilityFileEntry>,
  selectedFilesInput: string[] | undefined,
  paperclipExtensionPath: string,
) {
  if (!selectedFilesInput || selectedFilesInput.length === 0) {
    return files;
  }

  const selectedFiles = new Set(
    selectedFilesInput
      .map((entry) => normalizePortablePath(entry))
      .filter((entry) => entry.length > 0),
  );
  const filtered: Record<string, CompanyPortabilityFileEntry> = {};
  for (const [filePath, content] of Object.entries(files)) {
    if (!selectedFiles.has(filePath)) continue;
    filtered[filePath] = content;
  }

  const extensionEntry = filtered[paperclipExtensionPath];
  if (selectedFiles.has(paperclipExtensionPath) && typeof extensionEntry === "string") {
    filtered[paperclipExtensionPath] = filterPortableExtensionYaml(extensionEntry, selectedFiles);
  }

  return filtered;
}

function findPaperclipExtensionPath(files: Record<string, CompanyPortabilityFileEntry>) {
  if (typeof files[".paperclip.yaml"] === "string") return ".paperclip.yaml";
  if (typeof files[".paperclip.yml"] === "string") return ".paperclip.yml";
  return Object.keys(files).find((entry) => entry.endsWith("/.paperclip.yaml") || entry.endsWith("/.paperclip.yml")) ?? null;
}

function ensureMarkdownPath(pathValue: string) {
  const normalized = pathValue.replace(/\\/g, "/");
  if (!normalized.endsWith(".md")) {
    throw unprocessable(`Manifest file path must end in .md: ${pathValue}`);
  }
  return normalized;
}

function normalizePortableConfig(
  value: unknown,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(input)) {
    if (
      key === "cwd" ||
      key === "instructionsFilePath" ||
      key === "instructionsBundleMode" ||
      key === "instructionsRootPath" ||
      key === "instructionsEntryFile" ||
      key === "promptTemplate" ||
      key === "bootstrapPromptTemplate" || // deprecated — kept for backward compat
      key === "paperclipSkillSync"
    ) continue;
    if (key === "env") continue;
    next[key] = entry;
  }

  return next;
}

function isAbsoluteCommand(value: string) {
  return path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value);
}

function extractPortableEnvInputs(
  agentSlug: string,
  envValue: unknown,
  warnings: string[],
): CompanyPortabilityEnvInput[] {
  return extractPortableScopedEnvInputs(
    {
      label: `agent ${agentSlug}`,
      warningPrefix: `Agent ${agentSlug}`,
      agentSlug,
      projectSlug: null,
    },
    async importCompany() {
      throw new Error("Company portability not available in Ciutatis");
    },
    async previewImport() {
      throw new Error("Company portability not available in Ciutatis");
    },
    async exportBundle() {
      throw new Error("Company portability not available in Ciutatis");
    envValue,
    warnings,
  );
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isPathDefault(pathSegments: string[], value: unknown, rules: Array<{ path: string[]; value: unknown }>) {
  return rules.some((rule) => jsonEqual(rule.path, pathSegments) && jsonEqual(rule.value, value));
}

function pruneDefaultLikeValue(
  value: unknown,
  opts: {
    dropFalseBooleans: boolean;
    path?: string[];
    defaultRules?: Array<{ path: string[]; value: unknown }>;
  },
): unknown {
  const pathSegments = opts.path ?? [];
  if (opts.defaultRules && isPathDefault(pathSegments, value, opts.defaultRules)) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => pruneDefaultLikeValue(entry, { ...opts, path: pathSegments }));
  }
  if (isPlainRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const next = pruneDefaultLikeValue(entry, {
        ...opts,
        path: [...pathSegments, key],
      });
      if (next === undefined) continue;
      out[key] = next;
    }
    return out;
  }
  if (value === undefined) return undefined;
  if (opts.dropFalseBooleans && value === false) return undefined;
  return value;
}

function renderYamlScalar(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return JSON.stringify(value);
}

function isEmptyObject(value: unknown): boolean {
  return isPlainRecord(value) && Object.keys(value).length === 0;
}

function isEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

function stripEmptyValues(value: unknown, opts?: { preserveEmptyStrings?: boolean }): unknown {
  if (Array.isArray(value)) {
    const next = value
      .map((entry) => stripEmptyValues(entry, opts))
      .filter((entry) => entry !== undefined);
    return next.length > 0 ? next : undefined;
  }
  if (isPlainRecord(value)) {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const cleaned = stripEmptyValues(entry, opts);
      if (cleaned === undefined) continue;
      next[key] = cleaned;
    }
    return Object.keys(next).length > 0 ? next : undefined;
  }
  if (
    value === undefined ||
    value === null ||
    (!opts?.preserveEmptyStrings && value === "") ||
    isEmptyArray(value) ||
    isEmptyObject(value)
  ) {
    return undefined;
  }
  return value;
}

const YAML_KEY_PRIORITY = [
  "name",
  "description",
  "title",
  "schema",
  "kind",
  "slug",
  "reportsTo",
  "reportsToExistingAgentId",
  "reportsToExistingAgentSlug",
  "skills",
  "owner",
  "assignee",
  "project",
  "schedule",
  "version",
  "license",
  "authors",
  "homepage",
  "tags",
  "includes",
  "requirements",
  "role",
  "icon",
  "capabilities",
  "brandColor",
  "logoPath",
  "adapter",
  "runtime",
  "permissions",
  "permissionGrants",
  "budgetMonthlyCents",
  "metadata",
] as const;

const YAML_KEY_PRIORITY_INDEX = new Map<string, number>(
  YAML_KEY_PRIORITY.map((key, index) => [key, index]),
);

function compareYamlKeys(left: string, right: string) {
  const leftPriority = YAML_KEY_PRIORITY_INDEX.get(left);
  const rightPriority = YAML_KEY_PRIORITY_INDEX.get(right);
  if (leftPriority !== undefined || rightPriority !== undefined) {
    if (leftPriority === undefined) return 1;
    if (rightPriority === undefined) return -1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  }
  return left.localeCompare(right);
}

function orderedYamlEntries(value: Record<string, unknown>) {
  return Object.entries(value).sort(([leftKey], [rightKey]) => compareYamlKeys(leftKey, rightKey));
}

function renderYamlBlock(value: unknown, indentLevel: number): string[] {
  const indent = "  ".repeat(indentLevel);

  if (Array.isArray(value)) {
    if (value.length === 0) return [`${indent}[]`];
    const lines: string[] = [];
    for (const entry of value) {
      const scalar =
        entry === null ||
        typeof entry === "string" ||
        typeof entry === "boolean" ||
        typeof entry === "number" ||
        Array.isArray(entry) && entry.length === 0 ||
        isEmptyObject(entry);
      if (scalar) {
        lines.push(`${indent}- ${renderYamlScalar(entry)}`);
        continue;
      }
      lines.push(`${indent}-`);
      lines.push(...renderYamlBlock(entry, indentLevel + 1));
    }
    return lines;
  }

  if (isPlainRecord(value)) {
    const entries = orderedYamlEntries(value);
    if (entries.length === 0) return [`${indent}{}`];
    const lines: string[] = [];
    for (const [key, entry] of entries) {
      const scalar =
        entry === null ||
        typeof entry === "string" ||
        typeof entry === "boolean" ||
        typeof entry === "number" ||
        Array.isArray(entry) && entry.length === 0 ||
        isEmptyObject(entry);
      if (scalar) {
        lines.push(`${indent}${key}: ${renderYamlScalar(entry)}`);
        continue;
      }
      lines.push(`${indent}${key}:`);
      lines.push(...renderYamlBlock(entry, indentLevel + 1));
    }
    return lines;
  }

  return [`${indent}${renderYamlScalar(value)}`];
}

function renderFrontmatter(frontmatter: Record<string, unknown>) {
  const lines: string[] = ["---"];
  for (const [key, value] of orderedYamlEntries(frontmatter)) {
    // Skip null/undefined values — don't export empty fields
    if (value === null || value === undefined) continue;
    const scalar =
      typeof value === "string" ||
      typeof value === "boolean" ||
      typeof value === "number" ||
      Array.isArray(value) && value.length === 0 ||
      isEmptyObject(value);
    if (scalar) {
      lines.push(`${key}: ${renderYamlScalar(value)}`);
      continue;
    }
    lines.push(`${key}:`);
    lines.push(...renderYamlBlock(value, 1));
  }
  lines.push("---");
  return `${lines.join("\n")}\n`;
}

function buildMarkdown(frontmatter: Record<string, unknown>, body: string) {
  const cleanBody = body.replace(/\r\n/g, "\n").trim();
  if (!cleanBody) {
    return `${renderFrontmatter(frontmatter)}\n`;
  }
  return `${renderFrontmatter(frontmatter)}\n${cleanBody}\n`;
}

function normalizeSelectedFiles(selectedFiles?: string[]) {
  if (!selectedFiles) return null;
  return new Set(
    selectedFiles
      .map((entry) => normalizePortablePath(entry))
      .filter((entry) => entry.length > 0),
  );
}

function filterCompanyMarkdownIncludes(
  companyPath: string,
  markdown: string,
  selectedFiles: Set<string>,
) {
  const parsed = parseFrontmatterMarkdown(markdown);
  const includeEntries = readIncludeEntries(parsed.frontmatter);
  const filteredIncludes = includeEntries.filter((entry) =>
    selectedFiles.has(resolvePortablePath(companyPath, entry.path)),
  );
  const nextFrontmatter: Record<string, unknown> = { ...parsed.frontmatter };
  if (filteredIncludes.length > 0) {
    nextFrontmatter.includes = filteredIncludes.map((entry) => entry.path);
  } else {
    delete nextFrontmatter.includes;
  }
  return buildMarkdown(nextFrontmatter, parsed.body);
}

function applySelectedFilesToSource(source: ResolvedSource, selectedFiles?: string[]): ResolvedSource {
  const normalizedSelection = normalizeSelectedFiles(selectedFiles);
  if (!normalizedSelection) return source;

  const companyPath = source.manifest.company
    ? ensureMarkdownPath(source.manifest.company.path)
    : Object.keys(source.files).find((entry) => entry.endsWith("/COMPANY.md") || entry === "COMPANY.md") ?? null;
  if (!companyPath) {
    throw unprocessable("Company package is missing COMPANY.md");
  }

  const companyMarkdown = source.files[companyPath];
  if (typeof companyMarkdown !== "string") {
    throw unprocessable("Company package is missing COMPANY.md");
  }

  const effectiveFiles: Record<string, CompanyPortabilityFileEntry> = {};
  for (const [filePath, content] of Object.entries(source.files)) {
    const normalizedPath = normalizePortablePath(filePath);
    if (!normalizedSelection.has(normalizedPath)) continue;
    effectiveFiles[normalizedPath] = content;
  }

  effectiveFiles[companyPath] = filterCompanyMarkdownIncludes(
    companyPath,
    companyMarkdown,
    normalizedSelection,
  );

  const filtered = buildManifestFromPackageFiles(effectiveFiles, {
    sourceLabel: source.manifest.source,
  });

  if (!normalizedSelection.has(companyPath)) {
    filtered.manifest.company = null;
  }

  filtered.manifest.includes = {
    company: filtered.manifest.company !== null,
    agents: filtered.manifest.agents.length > 0,
    projects: filtered.manifest.projects.length > 0,
    issues: filtered.manifest.issues.length > 0,
    skills: filtered.manifest.skills.length > 0,
  };

  return filtered;
}

async function resolveBundledSkillsCommit() {
  if (!bundledSkillsCommitPromise) {
    bundledSkillsCommitPromise = execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
    })
      .then(({ stdout }) => stdout.trim() || null)
      .catch(() => null);
  }
  return bundledSkillsCommitPromise;
}

async function buildSkillSourceEntry(skill: CompanySkill) {
  const metadata = isPlainRecord(skill.metadata) ? skill.metadata : null;
  if (asString(metadata?.sourceKind) === "paperclip_bundled") {
    const commit = await resolveBundledSkillsCommit();
    return {
      kind: "github-dir",
      repo: "paperclipai/paperclip",
      path: `skills/${skill.slug}`,
      commit,
      trackingRef: "master",
      url: `https://github.com/paperclipai/paperclip/tree/master/skills/${skill.slug}`,
    };
  }

  if (skill.sourceType === "github" || skill.sourceType === "skills_sh") {
    const owner = asString(metadata?.owner);
    const repo = asString(metadata?.repo);
    const repoSkillDir = asString(metadata?.repoSkillDir);
    if (!owner || !repo || !repoSkillDir) return null;
    return {
      kind: "github-dir",
      repo: `${owner}/${repo}`,
      path: repoSkillDir,
      commit: skill.sourceRef ?? null,
      trackingRef: asString(metadata?.trackingRef),
      url: skill.sourceLocator,
    };
  }

  if (skill.sourceType === "url" && skill.sourceLocator) {
    return {
      kind: "url",
      url: skill.sourceLocator,
    };
  }

  return null;
}

function shouldReferenceSkillOnExport(skill: CompanySkill, expandReferencedSkills: boolean) {
  if (expandReferencedSkills) return false;
  const metadata = isPlainRecord(skill.metadata) ? skill.metadata : null;
  if (asString(metadata?.sourceKind) === "paperclip_bundled") return true;
  return skill.sourceType === "github" || skill.sourceType === "skills_sh" || skill.sourceType === "url";
}

async function buildReferencedSkillMarkdown(skill: CompanySkill) {
  const sourceEntry = await buildSkillSourceEntry(skill);
  const frontmatter: Record<string, unknown> = {
    key: skill.key,
    slug: skill.slug,
    name: skill.name,
    description: skill.description ?? null,
  };
  if (sourceEntry) {
    frontmatter.metadata = {
      sources: [sourceEntry],
    };
  }
  return buildMarkdown(frontmatter, "");
}

async function withSkillSourceMetadata(skill: CompanySkill, markdown: string) {
  const sourceEntry = await buildSkillSourceEntry(skill);
  const parsed = parseFrontmatterMarkdown(markdown);
  const metadata = isPlainRecord(parsed.frontmatter.metadata)
    ? { ...parsed.frontmatter.metadata }
    : {};
  const existingSources = Array.isArray(metadata.sources)
    ? metadata.sources.filter((entry) => isPlainRecord(entry))
    : [];
  if (sourceEntry) {
    metadata.sources = [...existingSources, sourceEntry];
  }
  const catalogProvenance = buildPortableCatalogProvenance(skill);
  metadata.skillKey = skill.key;
  metadata.paperclipSkillKey = skill.key;
  metadata.paperclip = {
    ...(isPlainRecord(metadata.paperclip) ? metadata.paperclip : {}),
    skillKey: skill.key,
    slug: skill.slug,
    ...(catalogProvenance ? { catalog: catalogProvenance } : {}),
  };
  const frontmatter = {
    ...parsed.frontmatter,
    key: skill.key,
    slug: skill.slug,
    metadata,
  };
  return buildMarkdown(frontmatter, parsed.body);
}


function parseYamlScalar(rawValue: string): unknown {
  const trimmed = rawValue.trim();
  if (trimmed === "") return "";
  if (trimmed === "null" || trimmed === "~") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    trimmed.startsWith("\"") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("{")
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function prepareYamlLines(raw: string) {
  return raw
    .split("\n")
    .map((line) => ({
      indent: line.match(/^ */)?.[0].length ?? 0,
      content: line.trim(),
    }))
    .filter((line) => line.content.length > 0 && !line.content.startsWith("#"));
}

function parseYamlBlock(
  lines: Array<{ indent: number; content: string }>,
  startIndex: number,
  indentLevel: number,
): { value: unknown; nextIndex: number } {
  let index = startIndex;
  while (index < lines.length && lines[index]!.content.length === 0) {
    index += 1;
  }
  if (index >= lines.length || lines[index]!.indent < indentLevel) {
    return { value: {}, nextIndex: index };
  }

  const isArray = lines[index]!.indent === indentLevel && lines[index]!.content.startsWith("-");
  if (isArray) {
    const values: unknown[] = [];
    while (index < lines.length) {
      const line = lines[index]!;
      if (line.indent < indentLevel) break;
      if (line.indent !== indentLevel || !line.content.startsWith("-")) break;
      const remainder = line.content.slice(1).trim();
      index += 1;
      if (!remainder) {
        const nested = parseYamlBlock(lines, index, indentLevel + 2);
        values.push(nested.value);
        index = nested.nextIndex;
        continue;
      }
      const inlineObjectSeparator = remainder.indexOf(":");
      if (
        inlineObjectSeparator > 0 &&
        !remainder.startsWith("\"") &&
        !remainder.startsWith("{") &&
        !remainder.startsWith("[")
      ) {
        const key = remainder.slice(0, inlineObjectSeparator).trim();
        const rawValue = remainder.slice(inlineObjectSeparator + 1).trim();
        const nextObject: Record<string, unknown> = {
          [key]: parseYamlScalar(rawValue),
        };
        if (index < lines.length && lines[index]!.indent > indentLevel) {
          const nested = parseYamlBlock(lines, index, indentLevel + 2);
          if (isPlainRecord(nested.value)) {
            Object.assign(nextObject, nested.value);
          }
          index = nested.nextIndex;
        }
        values.push(nextObject);
        continue;
      }
      values.push(parseYamlScalar(remainder));
    }
    return { value: values, nextIndex: index };
  }

  const record: Record<string, unknown> = {};
  while (index < lines.length) {
    const line = lines[index]!;
    if (line.indent < indentLevel) break;
    if (line.indent !== indentLevel) {
      index += 1;
      continue;
    }
    const separatorIndex = line.content.indexOf(":");
    if (separatorIndex <= 0) {
      index += 1;
      continue;
    }
    const key = line.content.slice(0, separatorIndex).trim();
    const remainder = line.content.slice(separatorIndex + 1).trim();
    index += 1;
    if (!remainder) {
      const nested = parseYamlBlock(lines, index, indentLevel + 2);
      record[key] = nested.value;
      index = nested.nextIndex;
      continue;
    }
    record[key] = parseYamlScalar(remainder);
  }

  return { value: record, nextIndex: index };
}

function parseYamlFrontmatter(raw: string): Record<string, unknown> {
  const prepared = prepareYamlLines(raw);
  if (prepared.length === 0) return {};
  const parsed = parseYamlBlock(prepared, 0, prepared[0]!.indent);
  return isPlainRecord(parsed.value) ? parsed.value : {};
}

function parseYamlFile(raw: string): Record<string, unknown> {
  return parseYamlFrontmatter(raw);
}

function buildYamlFile(value: Record<string, unknown>, opts?: { preserveEmptyStrings?: boolean }) {
  const cleaned = stripEmptyValues(value, opts);
  if (!isPlainRecord(cleaned)) return "{}\n";
  return renderYamlBlock(cleaned, 0).join("\n") + "\n";
}

function parseFrontmatterMarkdown(raw: string): MarkdownDoc {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: {}, body: normalized.trim() };
  }
  const closing = normalized.indexOf("\n---\n", 4);
  if (closing < 0) {
    return { frontmatter: {}, body: normalized.trim() };
  }
  const frontmatterRaw = normalized.slice(4, closing).trim();
  const body = normalized.slice(closing + 5).trim();
  return {
    frontmatter: parseYamlFrontmatter(frontmatterRaw),
    body,
  };
}

async function fetchText(url: string) {
  const response = await ghFetch(url);
  if (!response.ok) {
    throw unprocessable(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function fetchOptionalText(url: string) {
  const response = await ghFetch(url);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw unprocessable(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function fetchBinary(url: string) {
  const response = await ghFetch(url);
  if (!response.ok) {
    throw unprocessable(`Failed to fetch ${url}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await ghFetch(url, {
    headers: {
      accept: "application/vnd.github+json",
  });
  if (!response.ok) {
    throw unprocessable(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function dedupeEnvInputs(values: CompanyPortabilityManifest["envInputs"]) {
  const seen = new Set<string>();
  const out: CompanyPortabilityManifest["envInputs"] = [];
  for (const value of values) {
    const key = `${value.agentSlug ?? ""}:${value.projectSlug ?? ""}:${value.key.toUpperCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function buildEnvInputMap(inputs: CompanyPortabilityEnvInput[]) {
  const env: Record<string, Record<string, unknown>> = {};
  for (const input of inputs) {
    const entry: Record<string, unknown> = {
      kind: input.kind,
      requirement: input.requirement,
    };
    if (input.defaultValue !== null) entry.default = input.defaultValue;
    if (input.description) entry.description = input.description;
    if (input.portability === "system_dependent") entry.portability = "system_dependent";
    env[input.key] = entry;
  }
  return env;
}

function envInputScopedKey(input: CompanyPortabilityEnvInput) {
  if (input.agentSlug) return `agent:${input.agentSlug}:${input.key}`;
  if (input.projectSlug) return `project:${input.projectSlug}:${input.key}`;
  return input.key;
}

function envInputValue(input: CompanyPortabilityEnvInput, values: Record<string, string> | null | undefined) {
  if (!values) return null;
  const scopedKey = envInputScopedKey(input);
  if (Object.prototype.hasOwnProperty.call(values, scopedKey)) return values[scopedKey];
  if (Object.prototype.hasOwnProperty.call(values, input.key)) return values[input.key];
  return null;
}

function importSecretLabel(input: CompanyPortabilityEnvInput) {
  const scope = input.agentSlug
    ? `agent ${input.agentSlug}`
    : input.projectSlug
      ? `project ${input.projectSlug}`
      : "company import";
  return `${scope} ${input.key}`;
}

function importSecretKey(input: CompanyPortabilityEnvInput, suffix: string) {
  const scope = input.agentSlug
    ? `agent-${input.agentSlug}`
    : input.projectSlug
      ? `project-${input.projectSlug}`
      : "company";
  return `import-${scope}-${input.key}-${suffix}`;
}

function writeManifestEnvBinding(
  manifest: CompanyPortabilityManifest,
  input: CompanyPortabilityEnvInput,
  binding: AgentEnvConfig[string],
) {
  if (input.agentSlug) {
    const agent = manifest.agents.find((entry) => entry.slug === input.agentSlug);
    if (!agent) return;
    const adapterConfig = isPlainRecord(agent.adapterConfig) ? agent.adapterConfig : {};
    const env = isPlainRecord(adapterConfig.env) ? { ...adapterConfig.env } : {};
    env[input.key] = binding;
    agent.adapterConfig = { ...adapterConfig, env };
    return;
  }

  if (input.projectSlug) {
    const project = manifest.projects.find((entry) => entry.slug === input.projectSlug);
    if (!project) return;
    project.env = {
      ...(project.env ?? {}),
      [input.key]: binding,
    };
  }
}

function readCompanyApprovalDefault(_frontmatter: Record<string, unknown>) {
  return false;
}

function readIncludeEntries(frontmatter: Record<string, unknown>): CompanyPackageIncludeEntry[] {
  const includes = frontmatter.includes;
  if (!Array.isArray(includes)) return [];
  return includes.flatMap((entry) => {
    if (typeof entry === "string") {
      return [{ path: entry }];
    }
    if (isPlainRecord(entry)) {
      const pathValue = asString(entry.path);
      return pathValue ? [{ path: pathValue }] : [];
    }
    return [];
  });
}

function readAgentEnvInputs(
  extension: Record<string, unknown>,
  agentSlug: string,
): CompanyPortabilityManifest["envInputs"] {
  const inputs = isPlainRecord(extension.inputs) ? extension.inputs : null;
  const env = inputs && isPlainRecord(inputs.env) ? inputs.env : null;
  if (!env) return [];

  return Object.entries(env).flatMap(([key, value]) => {
    if (!isPlainRecord(value)) return [];
    const record = value as EnvInputRecord;
    return [{
      key,
      description: asString(record.description) ?? null,
      agentSlug,
      projectSlug: null,
      kind: record.kind === "plain" ? "plain" : "secret",
      requirement: record.requirement === "required" ? "required" : "optional",
      defaultValue: typeof record.default === "string" ? record.default : null,
      portability: record.portability === "system_dependent" ? "system_dependent" : "portable",
    }];
  });
}

function readProjectEnvInputs(
  extension: Record<string, unknown>,
  projectSlug: string,
): CompanyPortabilityManifest["envInputs"] {
  const inputs = isPlainRecord(extension.inputs) ? extension.inputs : null;
  const env = inputs && isPlainRecord(inputs.env) ? inputs.env : null;
  if (!env) return [];

  return Object.entries(env).flatMap(([key, value]) => {
    if (!isPlainRecord(value)) return [];
    const record = value as EnvInputRecord;
    return [{
      key,
      description: asString(record.description) ?? null,
      agentSlug: null,
      projectSlug,
      kind: record.kind === "plain" ? "plain" : "secret",
      requirement: record.requirement === "required" ? "required" : "optional",
      defaultValue: typeof record.default === "string" ? record.default : null,
      portability: record.portability === "system_dependent" ? "system_dependent" : "portable",
    }];
  });
}

function readAgentSkillRefs(frontmatter: Record<string, unknown>) {
  const skills = frontmatter.skills;
  if (!Array.isArray(skills)) return [];
  return Array.from(new Set(
    skills
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => normalizeSkillKey(entry) ?? entry.trim())
      .filter(Boolean),
  ));
}

function buildManifestFromPackageFiles(
  files: Record<string, CompanyPortabilityFileEntry>,
  opts?: { sourceLabel?: { companyId: string; companyName: string } | null },
): ResolvedSource {
  const normalizedFiles = normalizeFileMap(files);
  const companyPath = typeof normalizedFiles["COMPANY.md"] === "string"
    ? normalizedFiles["COMPANY.md"]
    : undefined;
  const resolvedCompanyPath = companyPath !== undefined
    ? "COMPANY.md"
    : Object.keys(normalizedFiles).find((entry) => entry.endsWith("/COMPANY.md") || entry === "COMPANY.md");
  if (!resolvedCompanyPath) {
    throw unprocessable("Company package is missing COMPANY.md");
  }

  const companyMarkdown = readPortableTextFile(normalizedFiles, resolvedCompanyPath);
  if (typeof companyMarkdown !== "string") {
    throw unprocessable(`Company package file is not readable as text: ${resolvedCompanyPath}`);
  }
  const companyDoc = parseFrontmatterMarkdown(companyMarkdown);
  const companyFrontmatter = companyDoc.frontmatter;
  const paperclipExtensionPath = findPaperclipExtensionPath(normalizedFiles);
  const paperclipExtension = paperclipExtensionPath
    ? parseYamlFile(readPortableTextFile(normalizedFiles, paperclipExtensionPath) ?? "")
    : {};
  const paperclipCompany = isPlainRecord(paperclipExtension.company) ? paperclipExtension.company : {};
  const paperclipSidebar = normalizePortableSidebarOrder(paperclipExtension.sidebar);
  const paperclipAgents = isPlainRecord(paperclipExtension.agents) ? paperclipExtension.agents : {};
  const paperclipProjects = isPlainRecord(paperclipExtension.projects) ? paperclipExtension.projects : {};
  const paperclipTasks = isPlainRecord(paperclipExtension.tasks) ? paperclipExtension.tasks : {};
  const paperclipRoutines = isPlainRecord(paperclipExtension.routines) ? paperclipExtension.routines : {};
  const companyName =
    asString(companyFrontmatter.name)
    ?? opts?.sourceLabel?.companyName
    ?? "Imported Company";
  const companySlug =
    asString(companyFrontmatter.slug)
    ?? normalizeAgentUrlKey(companyName)
    ?? "company";

  const includeEntries = readIncludeEntries(companyFrontmatter);
  const referencedAgentPaths = includeEntries
    .map((entry) => resolvePortablePath(resolvedCompanyPath, entry.path))
    .filter((entry) => entry.endsWith("/AGENTS.md") || entry === "AGENTS.md");
  const referencedProjectPaths = includeEntries
    .map((entry) => resolvePortablePath(resolvedCompanyPath, entry.path))
    .filter((entry) => entry.endsWith("/PROJECT.md") || entry === "PROJECT.md");
  const referencedTaskPaths = includeEntries
    .map((entry) => resolvePortablePath(resolvedCompanyPath, entry.path))
    .filter((entry) => entry.endsWith("/TASK.md") || entry === "TASK.md");
  const referencedSkillPaths = includeEntries
    .map((entry) => resolvePortablePath(resolvedCompanyPath, entry.path))
    .filter((entry) => entry.endsWith("/SKILL.md") || entry === "SKILL.md");
  const discoveredAgentPaths = Object.keys(normalizedFiles).filter(
    (entry) => entry.endsWith("/AGENTS.md") || entry === "AGENTS.md",
  );
  const discoveredProjectPaths = Object.keys(normalizedFiles).filter(
    (entry) => entry.endsWith("/PROJECT.md") || entry === "PROJECT.md",
  );
  const discoveredTaskPaths = Object.keys(normalizedFiles).filter(
    (entry) => entry.endsWith("/TASK.md") || entry === "TASK.md",
  );
  const discoveredSkillPaths = Object.keys(normalizedFiles).filter(
    (entry) => entry.endsWith("/SKILL.md") || entry === "SKILL.md",
  );
  const agentPaths = Array.from(new Set([...referencedAgentPaths, ...discoveredAgentPaths])).sort();
  const projectPaths = Array.from(new Set([...referencedProjectPaths, ...discoveredProjectPaths])).sort();
  const taskPaths = Array.from(new Set([...referencedTaskPaths, ...discoveredTaskPaths])).sort();
  const skillPaths = Array.from(new Set([...referencedSkillPaths, ...discoveredSkillPaths])).sort();

  const manifest: CompanyPortabilityManifest = {
    schemaVersion: 5,
    generatedAt: new Date().toISOString(),
    source: opts?.sourceLabel ?? null,
    includes: {
      company: true,
      agents: true,
      projects: projectPaths.length > 0,
      issues: taskPaths.length > 0,
      skills: skillPaths.length > 0,
    },
    async importBundle() {
      throw new Error("Company portability not available in Ciutatis");
    },
  };
}
