import type {
  TenantProvisioningJobKind,
  TenantProvisioningJobStatus,
  TenantProvisioningJobTrigger,
  TenantProvisioningStep,
} from "../constants.js";

export interface TenantProvisioningJob {
  id: string;
  tenantId: string;
  kind: TenantProvisioningJobKind;
  status: TenantProvisioningJobStatus;
  trigger: TenantProvisioningJobTrigger;
  step: TenantProvisioningStep;
  attempt: number;
  errorCode: string | null;
  errorMessage: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  updatedAt: Date;
}
