import { Router, type Request } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import {
  createCompanySchema,
  updateCompanySchema,
  companyPortabilityExportSchema,
  companyPortabilityImportSchema,
  companyPortabilityPreviewSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import {
  agentService,
  companyPortabilityService,
  companyService,
  logActivity,
} from "../services/index.js";
import { forbidden, notFound } from "../errors.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";

const updateCompanyBrandingSchema = z
  .object({
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
    logoAssetId: z.string().uuid().nullable().optional(),
  })
  .strict();

export function companyRoutes(db: Db): Router {
  const router = Router();
  const companiesSvc = companyService(db);
  const agentsSvc = agentService(db);
  const portabilitySvc = companyPortabilityService(db);

  async function requireCompany(companyId: string) {
    const company = await companiesSvc.getById(companyId);
    if (!company) throw notFound("Company not found");
    return company;
  }

  async function assertCanUpdateBranding(req: Request, companyId: string): Promise<void> {
    assertCompanyAccess(req, companyId);
    if (req.actor.type === "board") return;
    if (req.actor.type !== "agent" || !req.actor.agentId) {
      throw forbidden("Board or CEO agent authentication required");
    }
    const agent = await agentsSvc.getById(req.actor.agentId);
    if (!agent || agent.companyId !== companyId || agent.role !== "ceo") {
      throw forbidden("Only CEO agents can update company branding");
    }
  }

  router.get("/", async (req, res) => {
    assertBoard(req);
    const companies = await companiesSvc.list();
    if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) {
      res.json(companies);
      return;
    }
    const allowed = new Set(req.actor.companyIds ?? []);
    res.json(companies.filter((company) => allowed.has(company.id)));
  });

  router.get("/stats", async (req, res) => {
    assertBoard(req);
    const stats = await companiesSvc.stats();
    if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) {
      res.json(stats);
      return;
    }
    const allowed = new Set(req.actor.companyIds ?? []);
    res.json(Object.fromEntries(Object.entries(stats).filter(([companyId]) => allowed.has(companyId))));
  });

  router.post("/", validate(createCompanySchema), async (req, res) => {
    assertBoard(req);
    const company = await companiesSvc.create(req.body);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: company.id,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "company.created",
      entityType: "company",
      entityId: company.id,
      details: { name: company.name },
    });
    res.status(201).json(company);
  });

  router.post("/import/preview", validate(companyPortabilityPreviewSchema), async (req, res) => {
    assertBoard(req);
    res.json(await portabilitySvc.previewImport(req.body));
  });

  router.post("/import", validate(companyPortabilityImportSchema), async (req, res) => {
    assertBoard(req);
    res.status(201).json(await portabilitySvc.importBundle(req.body, req.actor.userId ?? null));
  });

  router.get("/:companyId", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await requireCompany(companyId));
  });

  router.patch("/:companyId", validate(updateCompanySchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertBoard(req);
    assertCompanyAccess(req, companyId);
    await requireCompany(companyId);
    const company = await companiesSvc.update(companyId, req.body);
    if (!company) throw notFound("Company not found");
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "company.updated",
      entityType: "company",
      entityId: companyId,
      details: req.body,
    });
    res.json(company);
  });

  router.patch("/:companyId/branding", validate(updateCompanyBrandingSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    await assertCanUpdateBranding(req, companyId);
    const company = await companiesSvc.update(companyId, req.body);
    if (!company) throw notFound("Company not found");
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "company.branding_updated",
      entityType: "company",
      entityId: companyId,
      details: req.body,
    });
    res.json(company);
  });

  router.post("/:companyId/archive", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertBoard(req);
    assertCompanyAccess(req, companyId);
    const company = await companiesSvc.archive(companyId);
    if (!company) throw notFound("Company not found");
    res.json(company);
  });

  router.delete("/:companyId", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertBoard(req);
    assertCompanyAccess(req, companyId);
    const removed = await companiesSvc.remove(companyId);
    if (!removed) throw notFound("Company not found");
    res.json({ ok: true });
  });

  router.post("/:companyId/export", validate(companyPortabilityExportSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertBoard(req);
    assertCompanyAccess(req, companyId);
    res.json(await portabilitySvc.exportBundle(companyId, req.body));
  });

  return router;
}
