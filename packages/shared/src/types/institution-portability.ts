export interface InstitutionPortabilityInclude {
  company: boolean;
  agents: boolean;
}

export interface InstitutionPortabilitySecretRequirement {
  key: string;
  description: string | null;
  agentSlug: string | null;
  providerHint: string | null;
}

export interface InstitutionPortabilityInstitutionManifestEntry {
  path: string;
  name: string;
  description: string | null;
  brandColor: string | null;
  requireBoardApprovalForNewAgents: boolean;
}

export interface InstitutionPortabilityAgentManifestEntry {
  slug: string;
  name: string;
  path: string;
  role: string;
  title: string | null;
  icon: string | null;
  capabilities: string | null;
  reportsToSlug: string | null;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  permissions: Record<string, unknown>;
  budgetMonthlyCents: number;
  metadata: Record<string, unknown> | null;
}

export interface InstitutionPortabilityManifest {
  schemaVersion: number;
  generatedAt: string;
  source: {
    companyId: string;
    companyName: string;
  } | null;
  includes: InstitutionPortabilityInclude;
  company: InstitutionPortabilityInstitutionManifestEntry | null;
  agents: InstitutionPortabilityAgentManifestEntry[];
  requiredSecrets: InstitutionPortabilitySecretRequirement[];
}

export interface InstitutionPortabilityExportResult {
  manifest: InstitutionPortabilityManifest;
  files: Record<string, string>;
  warnings: string[];
}

export type InstitutionPortabilitySource =
  | {
      type: "inline";
      manifest: InstitutionPortabilityManifest;
      files: Record<string, string>;
    }
  | {
      type: "url";
      url: string;
    }
  | {
      type: "github";
      url: string;
    };

export type InstitutionPortabilityImportTarget =
  | {
      mode: "new_company";
      newCompanyName?: string | null;
    }
  | {
      mode: "existing_company";
      companyId: string;
    };

export type InstitutionPortabilityAgentSelection = "all" | string[];

export type InstitutionPortabilityCollisionStrategy = "rename" | "skip" | "replace";

export interface InstitutionPortabilityPreviewRequest {
  source: InstitutionPortabilitySource;
  include?: Partial<InstitutionPortabilityInclude>;
  target: InstitutionPortabilityImportTarget;
  agents?: InstitutionPortabilityAgentSelection;
  collisionStrategy?: InstitutionPortabilityCollisionStrategy;
}

export interface InstitutionPortabilityPreviewAgentPlan {
  slug: string;
  action: "create" | "update" | "skip";
  plannedName: string;
  existingAgentId: string | null;
  reason: string | null;
}

export interface InstitutionPortabilityPreviewResult {
  include: InstitutionPortabilityInclude;
  targetCompanyId: string | null;
  targetCompanyName: string | null;
  collisionStrategy: InstitutionPortabilityCollisionStrategy;
  selectedAgentSlugs: string[];
  plan: {
    companyAction: "none" | "create" | "update";
    agentPlans: InstitutionPortabilityPreviewAgentPlan[];
  };
  requiredSecrets: InstitutionPortabilitySecretRequirement[];
  warnings: string[];
  errors: string[];
}

export interface InstitutionPortabilityImportRequest extends InstitutionPortabilityPreviewRequest {}

export interface InstitutionPortabilityImportResult {
  company: {
    id: string;
    name: string;
    action: "created" | "updated" | "unchanged";
  };
  agents: {
    slug: string;
    id: string | null;
    action: "created" | "updated" | "skipped";
    name: string;
    reason: string | null;
  }[];
  requiredSecrets: InstitutionPortabilitySecretRequirement[];
  warnings: string[];
}

export interface InstitutionPortabilityExportRequest {
  include?: Partial<InstitutionPortabilityInclude>;
}

// Backward-compat aliases
export type CompanyPortabilityInclude = InstitutionPortabilityInclude;
export type CompanyPortabilitySecretRequirement = InstitutionPortabilitySecretRequirement;
export type CompanyPortabilityCompanyManifestEntry = InstitutionPortabilityInstitutionManifestEntry;
export type CompanyPortabilityAgentManifestEntry = InstitutionPortabilityAgentManifestEntry;
export type CompanyPortabilityManifest = InstitutionPortabilityManifest;
export type CompanyPortabilityExportResult = InstitutionPortabilityExportResult;
export type CompanyPortabilitySource = InstitutionPortabilitySource;
export type CompanyPortabilityImportTarget = InstitutionPortabilityImportTarget;
export type CompanyPortabilityAgentSelection = InstitutionPortabilityAgentSelection;
export type CompanyPortabilityCollisionStrategy = InstitutionPortabilityCollisionStrategy;
export type CompanyPortabilityPreviewRequest = InstitutionPortabilityPreviewRequest;
export type CompanyPortabilityPreviewAgentPlan = InstitutionPortabilityPreviewAgentPlan;
export type CompanyPortabilityPreviewResult = InstitutionPortabilityPreviewResult;
export type CompanyPortabilityImportRequest = InstitutionPortabilityImportRequest;
export type CompanyPortabilityImportResult = InstitutionPortabilityImportResult;
export type CompanyPortabilityExportRequest = InstitutionPortabilityExportRequest;
