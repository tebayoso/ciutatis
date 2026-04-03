import { Router, type Request } from "express";
import type { Db } from "@ciutatis/db";
import {
  createTenantInstanceSchema,
  patchInstanceExperimentalSettingsSchema,
  patchTenantProvisioningSettingsSchema,
  updateTenantInstanceSchema,
} from "@ciutatis/shared";
import { forbidden } from "../errors.js";
import { validate } from "../middleware/validate.js";
import { instanceSettingsService, logActivity, tenantInstancesService } from "../services/index.js";
import { getActorInfo } from "./authz.js";

function assertCanManageInstanceSettings(req: Request) {
  if (req.actor.type !== "board") {
    throw forbidden("Board access required");
  }
  if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) {
    return;
  }
  throw forbidden("Instance admin access required");
}

export function instanceSettingsRoutes(db: Db) {
  const router = Router();
  const svc = instanceSettingsService(db);
  const tenants = tenantInstancesService(db);

  router.get("/instance/settings/experimental", async (req, res) => {
    assertCanManageInstanceSettings(req);
    res.json(await svc.getExperimental());
  });

  router.patch(
    "/instance/settings/experimental",
    validate(patchInstanceExperimentalSettingsSchema),
    async (req, res) => {
      assertCanManageInstanceSettings(req);
      const updated = await svc.updateExperimental(req.body);
      const actor = getActorInfo(req);
      const companyIds = await svc.listCompanyIds();
      await Promise.all(
        companyIds.map((companyId) =>
          logActivity(db, {
            companyId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            agentId: actor.agentId,
            runId: actor.runId,
            action: "instance.settings.experimental_updated",
            entityType: "instance_settings",
            entityId: updated.id,
            details: {
              experimental: updated.experimental,
              changedKeys: Object.keys(req.body).sort(),
            },
          }),
        ),
      );
      res.json(updated.experimental);
    },
  );

  router.get("/instance/settings/tenants", async (req, res) => {
    assertCanManageInstanceSettings(req);
    res.json(await tenants.list());
  });

  router.get("/instance/settings/tenant-provisioning", async (req, res) => {
    assertCanManageInstanceSettings(req);
    res.json(await svc.getTenantProvisioning());
  });

  router.patch(
    "/instance/settings/tenant-provisioning",
    validate(patchTenantProvisioningSettingsSchema),
    async (req, res) => {
      assertCanManageInstanceSettings(req);
      const updated = await svc.updateTenantProvisioning(req.body);
      const actor = getActorInfo(req);
      const companyIds = await svc.listCompanyIds();
      await Promise.all(
        companyIds.map((companyId) =>
          logActivity(db, {
            companyId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            agentId: actor.agentId,
            runId: actor.runId,
            action: "instance.settings.tenant_provisioning_updated",
            entityType: "instance_settings",
            entityId: updated.id,
            details: {
              changedKeys: Object.keys(req.body).sort(),
              tenantProvisioning: updated.tenantProvisioning,
            },
          }),
        ),
      );
      res.json(updated.tenantProvisioning);
    },
  );

  router.post("/instance/settings/tenants", validate(createTenantInstanceSchema), async (req, res) => {
    assertCanManageInstanceSettings(req);
    const created = await tenants.create(req.body);
    const actor = getActorInfo(req);
    const companyIds = await svc.listCompanyIds();
    await Promise.all(
      companyIds.map((companyId) =>
        logActivity(db, {
          companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          runId: actor.runId,
          action: "tenant.created",
          entityType: "tenant_instance",
          entityId: created.id,
          details: {
            pathPrefix: created.pathPrefix,
            workerName: created.workerName,
            routingMode: created.routingMode,
            status: created.status,
          },
        }),
      ),
    );
    res.status(201).json(created);
  });

  router.patch("/instance/settings/tenants/:tenantId", validate(updateTenantInstanceSchema), async (req, res) => {
    assertCanManageInstanceSettings(req);
    const tenantId = Array.isArray(req.params.tenantId) ? req.params.tenantId[0] : req.params.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant instance id is required" });
      return;
    }
    const updated = await tenants.update(tenantId, req.body);
    if (!updated) {
      res.status(404).json({ error: "Tenant instance not found" });
      return;
    }
    const actor = getActorInfo(req);
    const companyIds = await svc.listCompanyIds();
    await Promise.all(
      companyIds.map((companyId) =>
        logActivity(db, {
          companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          runId: actor.runId,
          action: "tenant.updated",
          entityType: "tenant_instance",
          entityId: updated.id,
          details: {
            status: updated.status,
            pathPrefix: updated.pathPrefix,
            routingMode: updated.routingMode,
            changedKeys: Object.keys(req.body).sort(),
          },
        }),
      ),
    );
    res.json(updated);
  });

  return router;
}
