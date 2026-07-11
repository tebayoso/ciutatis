import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Router } from "express";
import { badRequest, notFound } from "../errors.js";
import {
  findServerAdapter,
  isOverridePaused,
  listServerAdapters,
  registerServerAdapter,
  setOverridePaused,
  unregisterServerAdapter,
} from "../adapters/index.js";
import {
  addAdapterPlugin,
  getAdapterPluginByType,
  getAdapterPluginsDir,
  getDisabledAdapterTypes,
  listAdapterPlugins,
  removeAdapterPlugin,
  setAdapterDisabled,
} from "../services/adapter-plugin-store.js";
import {
  loadExternalAdapterPackage,
  reloadExternalAdapter,
} from "../adapters/plugin-loader.js";
import { assertInstanceAdmin } from "./authz.js";

const execFileAsync = promisify(execFile);

function requirePackageName(value: unknown): string {
  const packageName = typeof value === "string" ? value.trim() : "";
  if (!packageName) throw badRequest("packageName is required");
  return packageName;
}

async function installPackage(packageName: string): Promise<void> {
  await execFileAsync("npm", ["install", packageName], {
    cwd: getAdapterPluginsDir(),
  });
}

function adapterPayload(type: string) {
  const adapter = findServerAdapter(type);
  const plugin = getAdapterPluginByType(type);
  return {
    type,
    installedPackage: plugin?.packageName ?? null,
    disabled: getDisabledAdapterTypes().includes(type),
    overridePaused: isOverridePaused(type),
    models: adapter?.models ?? [],
  };
}

export function adapterRoutes(): Router {
interface AdapterCapabilities {
  supportsInstructionsBundle: boolean;
  supportsSkills: boolean;
  supportsLocalAgentJwt: boolean;
  requiresMaterializedRuntimeSkills: boolean;
  supportsModelProfiles: boolean;
  supportsAcp: boolean;
interface AdapterInfo {
  type: string;
  label: string;
  source: "builtin" | "external";
  modelsCount: number;
  loaded: boolean;
  disabled: boolean;
  capabilities: AdapterCapabilities;
  acp?: ServerAdapterModule["acp"];
  /** True when an external plugin has replaced a built-in adapter of the same type. */
  overriddenBuiltin?: boolean;
  /** True when the external override for a builtin type is currently paused. */
  overridePaused?: boolean;
  version?: string;
  packageName?: string;
  isLocalPath?: boolean;
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Resolve the adapter package directory (same rules as plugin-loader).
 */
function resolveAdapterPackageDir(record: AdapterPluginRecord): string {
  return record.localPath
    ? path.resolve(record.localPath)
    : path.resolve(getAdapterPluginsDir(), "node_modules", record.packageName);
/**
 * Read `version` from the adapter's package.json on disk.
 * This is the source of truth for what is actually installed (npm or local path).
 */
function readAdapterPackageVersionFromDisk(record: AdapterPluginRecord): string | undefined {
  try {
    const pkgDir = resolveAdapterPackageDir(record);
    const raw = fs.readFileSync(path.join(pkgDir, "package.json"), "utf-8");
    const v = JSON.parse(raw).version;
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  } catch {
    return undefined;
  }
function buildAdapterCapabilities(adapter: ServerAdapterModule): AdapterCapabilities {
    supportsInstructionsBundle: adapter.supportsInstructionsBundle ?? false,
    supportsSkills: Boolean(adapter.listSkills || adapter.syncSkills),
    supportsLocalAgentJwt: adapter.supportsLocalAgentJwt ?? false,
    requiresMaterializedRuntimeSkills: adapter.requiresMaterializedRuntimeSkills ?? false,
    supportsModelProfiles: Boolean(adapter.modelProfiles?.length || adapter.listModelProfiles),
    supportsAcp: Boolean(adapter.acp),
function buildAdapterInfo(adapter: ServerAdapterModule, externalRecord: AdapterPluginRecord | undefined, disabledSet: Set<string>): AdapterInfo {
  const fromDisk = externalRecord ? readAdapterPackageVersionFromDisk(externalRecord) : undefined;
    type: adapter.type,
    label: adapter.type, // ServerAdapterModule doesn't have a separate "label" field; type serves as label
    source: externalRecord ? "external" : "builtin",
    modelsCount: (adapter.models ?? []).length,
    loaded: true, // If it's in the registry, it's loaded
    disabled: disabledSet.has(adapter.type),
    capabilities: buildAdapterCapabilities(adapter),
    ...(adapter.acp ? { acp: adapter.acp } : {}),
    overriddenBuiltin: externalRecord ? BUILTIN_ADAPTER_TYPES.has(adapter.type) : undefined,
    overridePaused: BUILTIN_ADAPTER_TYPES.has(adapter.type) ? isOverridePaused(adapter.type) : undefined,
    // Prefer on-disk package.json so the UI reflects bumps without relying on store-only fields.
    version: fromDisk ?? externalRecord?.version,
    packageName: externalRecord?.packageName,
    isLocalPath: externalRecord?.localPath ? true : undefined,
/**
 * Normalize a local path that may be a Windows path into a WSL-compatible path.
 *
 * - Windows paths (e.g., "C:\\Users\\...") are converted via `wslpath -u`.
 * - Paths already starting with `/mnt/` or `/` are returned as-is.
 */
async function normalizeLocalPath(rawPath: string): Promise<string> {
  // Already a POSIX path (WSL or native Linux)
  if (rawPath.startsWith("/")) {
    return rawPath;
  }
  // Windows path detection: C:\ or C:/ pattern
  if (/^[A-Za-z]:[\\/]/.test(rawPath)) {
    try {
      const { stdout } = await execFileAsync("wslpath", ["-u", rawPath]);
      return stdout.trim();
    } catch (err) {
      logger.warn({ err, rawPath }, "wslpath conversion failed; using path as-is");
      return rawPath;
    }
  }
  return rawPath;
/**
 * Register an external adapter module into the server registry via the
 * hot-install path, resolving `sessionManagement` identically to how the
 * init-time IIFE does. Module-provided `sessionManagement` is honored first,
 * with fallback to the host registry by type for builtin-type overrides.
 *
 * Keeps the hot-install and init-time paths at parity so an adapter installed
 * via `POST /api/adapters/install` has the same shape in the registry as the
 * same adapter loaded on the next server restart.
 */
function registerWithSessionManagement(adapter: ServerAdapterModule): void {
  registerServerAdapter(resolveExternalAdapterRegistration(adapter));
// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export function adapterRoutes() {
  const router = Router();

  router.get("/adapters", (_req, res) => {
    const pluginTypes = new Set(listAdapterPlugins().map((plugin) => plugin.type));
    const types = new Set([
      ...listServerAdapters().map((adapter) => adapter.type),
      ...pluginTypes,
    ]);
    res.json(Array.from(types).sort().map(adapterPayload));
  });

  router.post("/adapters/install", async (req, res) => {
    assertInstanceAdmin(req);
    const packageName = requirePackageName(req.body?.packageName);
    await installPackage(packageName);
    const adapter = await loadExternalAdapterPackage(packageName);
    registerServerAdapter(adapter);
    addAdapterPlugin({
      packageName,
      type: adapter.type,
      installedAt: new Date().toISOString(),
    });
    res.status(201).json(adapterPayload(adapter.type));
  });

  router.patch("/adapters/:type", (req, res) => {
    const { packageName, isLocalPath = false, version } = req.body as AdapterInstallRequest;
    if (!packageName || typeof packageName !== "string") {
      res.status(400).json({ error: "packageName is required and must be a string." });
      return;
    }
    // Strip version suffix if the UI sends "pkg@1.2.3" instead of separating it
    // e.g. "@henkey/hermes-paperclip-adapter@0.3.0" → packageName + version
    let canonicalName = packageName;
    let explicitVersion = version;
    const versionSuffix = packageName.match(/@(\d+\.\d+\.\d+.*)$/);
    if (versionSuffix) {
      // For scoped packages: "@scope/name@1.2.3" → "@scope/name" + "1.2.3"
      // For unscoped: "name@1.2.3" → "name" + "1.2.3"
      const lastAtIndex = packageName.lastIndexOf("@");
      if (lastAtIndex > 0 && !explicitVersion) {
        canonicalName = packageName.slice(0, lastAtIndex);
        explicitVersion = versionSuffix[1];
      }
    }
    try {
      let installedVersion: string | undefined;
      let moduleLocalPath: string | undefined;
      if (!isLocalPath) {
        // npm install into the managed directory
        const pluginsDir = getAdapterPluginsDir();
        const spec = explicitVersion ? `${canonicalName}@${explicitVersion}` : canonicalName;
        logger.info({ spec, pluginsDir }, "Installing adapter package via npm");
        await execFileAsync("npm", ["install", "--no-save", spec], {
          cwd: pluginsDir,
          timeout: 120_000,
        });
        // Read installed version from package.json
        try {
          const pkgJsonPath = path.join(pluginsDir, "node_modules", canonicalName, "package.json");
          const pkgContent = await import("node:fs/promises");
          const pkgRaw = await pkgContent.readFile(pkgJsonPath, "utf-8");
          const pkg = JSON.parse(pkgRaw);
          const v = pkg.version;
          installedVersion =
            typeof v === "string" && v.trim().length > 0 ? v.trim() : explicitVersion;
        } catch {
          installedVersion = explicitVersion;
        }
      } else {
        // Local path — normalize (e.g., Windows → WSL) and use the resolved path
        moduleLocalPath = path.resolve(await normalizeLocalPath(packageName));
        try {
          const pkgRaw = await readFile(path.join(moduleLocalPath, "package.json"), "utf-8");
          const v = JSON.parse(pkgRaw).version;
          if (typeof v === "string" && v.trim().length > 0) {
            installedVersion = v.trim();
          }
        } catch {
          // leave installedVersion undefined if package.json is missing
        }
      }
      // Load and register the adapter (use canonicalName for path resolution)
      const adapterModule = await loadExternalAdapterPackage(canonicalName, moduleLocalPath);
      // External adapters may intentionally override built-in adapter types.
      // registerServerAdapter preserves the built-in as a fallback so pausing or
      // removing the override restores the original implementation.
      // Check if already registered (indicates a reinstall/update).
      // For built-in types the registry always returns the built-in, so we
      // additionally require an existing external plugin record to
      // distinguish a true reinstall from a first-time override.
      const existing = findServerAdapter(adapterModule.type);
      const isReinstall = existing !== null && !!getAdapterPluginByType(adapterModule.type);
      if (existing) {
        unregisterServerAdapter(adapterModule.type);
        logger.info({ type: adapterModule.type }, "Unregistered existing adapter for replacement");
      }
      // Register the new adapter
      registerWithSessionManagement(adapterModule);
      // Persist the record (use canonicalName without version suffix)
      const record: AdapterPluginRecord = {
        packageName: canonicalName,
        localPath: moduleLocalPath,
        version: installedVersion ?? explicitVersion,
        type: adapterModule.type,
        installedAt: new Date().toISOString(),
      };
      addAdapterPlugin(record);
      logger.info(
        { type: adapterModule.type, packageName: canonicalName },
        "External adapter installed and registered",
      );
      res.status(201).json({
        type: adapterModule.type,
        packageName: canonicalName,
        version: installedVersion ?? explicitVersion,
        installedAt: record.installedAt,
        requiresRestart: isReinstall,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err, packageName }, "Failed to install external adapter");
      // Distinguish npm errors from load errors
      if (message.includes("npm") || message.includes("ERR!")) {
        res.status(500).json({ error: `npm install failed: ${message}` });
      } else {
        res.status(500).json({ error: `Failed to install adapter: ${message}` });
      }
    }
  router.get("/adapters/:type", async (req, res) => {
    assertBoardOrgAccess(req);
    const adapterType = req.params.type;
    const adapter = findServerAdapter(adapterType);
    if (!adapter) {
      res.status(404).json({ error: `Adapter "${adapterType}" is not registered.` });
      return;
    }
    const externalRecord = getAdapterPluginByType(adapterType);
    const disabledSet = new Set(getDisabledAdapterTypes());
    res.json(buildAdapterInfo(adapter, externalRecord, disabledSet));
  /**
   * PATCH /api/adapters/:type
   *
   * Enable or disable an adapter. Disabled adapters are hidden from agent
   * creation menus but remain functional for existing agents.
   *
   * Request body: { "disabled": boolean }
   */
  router.patch("/adapters/:type", async (req, res) => {
    assertInstanceAdmin(req);
    const type = req.params.type as string;
    setAdapterDisabled(type, Boolean(req.body?.disabled));
    res.json(adapterPayload(type));
  });

  router.patch("/adapters/:type/override", (req, res) => {
    assertInstanceAdmin(req);
    const type = req.params.type as string;
    setOverridePaused(type, Boolean(req.body?.paused));
    res.json(adapterPayload(type));
  });

  router.delete("/adapters/:type", (req, res) => {
    assertInstanceAdmin(req);
    const type = req.params.type as string;
    unregisterServerAdapter(type);
    removeAdapterPlugin(type);
    res.json({ type, removed: true });

    const adapterType = req.params.type;

    if (!adapterType) {
      res.status(400).json({ error: "Adapter type is required." });
      return;
    }

    // Prevent removal of built-in adapters, unless this built-in type is
    // currently backed by an external adapter plugin override.
    if (BUILTIN_ADAPTER_TYPES.has(adapterType) && !getAdapterPluginByType(adapterType)) {
      res.status(403).json({
        error: `Cannot remove built-in adapter "${adapterType}".`,
      });
      return;
    }

    // Check that the adapter exists in the registry
    const existing = findServerAdapter(adapterType);
    if (!existing) {
      res.status(404).json({
        error: `Adapter "${adapterType}" is not registered.`,
      });
      return;
    }

    // Check that it's an external adapter
    const externalRecord = getAdapterPluginByType(adapterType);
    if (!externalRecord) {
      res.status(404).json({
        error: `Adapter "${adapterType}" is not an externally installed adapter.`,
      });
      return;
    }

    // If installed via npm (has packageName but no localPath), run npm uninstall
    if (externalRecord.packageName && !externalRecord.localPath) {
      try {
        const pluginsDir = getAdapterPluginsDir();
        await execFileAsync("npm", ["uninstall", externalRecord.packageName], {
          cwd: pluginsDir,
          timeout: 60_000,
        });
        logger.info(
          { type: adapterType, packageName: externalRecord.packageName },
          "npm uninstall completed for external adapter",
        );
      } catch (err) {
        logger.warn(
          { err, type: adapterType, packageName: externalRecord.packageName },
          "npm uninstall failed for external adapter; continuing with unregister",
        );
      }
    }

    // Unregister from the runtime registry
    unregisterServerAdapter(adapterType);

    // Remove from the persistent store
    removeAdapterPlugin(adapterType);

    logger.info({ type: adapterType }, "External adapter unregistered and removed");

    res.json({ type: adapterType, removed: true });
  });

  router.post("/adapters/:type/reload", async (req, res) => {
    assertInstanceAdmin(req);
    const type = req.params.type as string;
    const adapter = await reloadExternalAdapter(type);
    registerServerAdapter(adapter);
    res.json(adapterPayload(adapter.type));
  });

  router.post("/adapters/:type/reinstall", async (req, res) => {
    assertInstanceAdmin(req);
    const type = req.params.type as string;
    const plugin = getAdapterPluginByType(type);
    if (!plugin) throw notFound("External adapter is not installed");
    await installPackage(plugin.packageName);
    const adapter = await loadExternalAdapterPackage(plugin.packageName);
    registerServerAdapter(adapter);
    addAdapterPlugin({
      ...plugin,
      type: adapter.type,
      installedAt: new Date().toISOString(),
    });
    res.json(adapterPayload(adapter.type));
  });

  return router;
}
