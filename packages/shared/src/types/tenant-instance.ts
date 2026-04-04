import type {
  TenantBootstrapStatus,
  TenantInstanceStatus,
  TenantProvisioningJobKind,
  TenantProvisioningJobStatus,
  TenantProvisioningJobTrigger,
  TenantProvisioningStep,
  TenantRoutingMode,
} from "../constants.js";

export interface TenantProvisioningJobSummary {
  id: string;
  kind: TenantProvisioningJobKind;
  status: TenantProvisioningJobStatus;
  trigger: TenantProvisioningJobTrigger;
  step: TenantProvisioningStep;
  attempt: number;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorMessage: string | null;
}

export interface TenantInstance {
  id: string;
  name: string;
  municipalityName: string;
  countryCode: string;
  citySlug: string;
  shortCode: string;
  routingMode: TenantRoutingMode;
  status: TenantInstanceStatus;
  pathPrefix: string;
  dispatcherKey: string;
  hostname: string | null;
  workerName: string;
  dispatchScriptName: string | null;
  tenantD1DatabaseId: string | null;
  tenantD1DatabaseName: string | null;
  tenantKvNamespaceId: string | null;
  tenantKvNamespaceTitle: string | null;
  tenantR2BucketName: string | null;
  bootstrapStatus: TenantBootstrapStatus;
  lastDeploymentStartedAt: Date | null;
  lastDeploymentFinishedAt: Date | null;
  lastDeploymentError: string | null;
  latestJob: TenantProvisioningJobSummary | null;
  notes: string | null;
  tenantUrl: string;
  createdAt: Date;
  updatedAt: Date;
}
