import { activityLog } from "@ciutatis/db-cloudflare";
import type { Db } from "@ciutatis/db-cloudflare";

export interface LogActivityParams {
  companyId: string;
  actorType: "agent" | "user" | "system";
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  agentId?: string | null;
  runId?: string | null;
  details?: Record<string, unknown> | null;
}

export async function logActivity(db: Db, params: LogActivityParams) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(activityLog).values({
    id,
    companyId: params.companyId,
    actorType: params.actorType,
    actorId: params.actorId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    agentId: params.agentId ?? null,
    runId: params.runId ?? null,
    details: params.details ?? null,
    createdAt: now,
  });
}
