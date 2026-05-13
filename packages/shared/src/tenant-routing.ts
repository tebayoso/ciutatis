import type { TenantRoutingMode } from "./constants.js";
import {
  getTenantRoutingCountryConfig,
  type TenantJurisdictionType,
  type TenantRouteSegmentStrategy,
} from "./tenant-routing-configs/index.js";

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => values[key] ?? "");
}

export function normalizeTenantShortCode(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeTenantCountryCode(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeTenantCitySlug(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeTenantJurisdictionType(value: string | null | undefined, countryCode?: string | null) {
  const config = getTenantRoutingCountryConfig(countryCode);
  const normalized = (value ?? config?.defaultJurisdictionType ?? "municipio").trim().toLowerCase();
  return config?.jurisdictionAliases[normalized] ?? normalized;
}

export function normalizeTenantPostalCode(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeTenantRouteSegment(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function normalizeTenantPathPrefix(pathPrefix: string) {
  const normalized = pathPrefix.trim().replace(/\/+/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeWorkerName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function buildRouteSegment(input: {
  citySlug: string;
  postalCode: string | null;
  shortCode: string;
  strategy: TenantRouteSegmentStrategy;
}) {
  if (input.strategy === "postal-slug") {
    return normalizeTenantRouteSegment(`${input.postalCode || input.shortCode}-${input.citySlug}`);
  }
  if (input.strategy === "slug-postal") {
    return normalizeTenantRouteSegment(`${input.citySlug}-${input.postalCode || input.shortCode}`);
  }
  if (input.strategy === "legacy-city-short-code") {
    return normalizeTenantRouteSegment(`${input.citySlug}-${input.shortCode}`);
  }
  return normalizeTenantRouteSegment(input.citySlug);
}

export interface TenantRouteInput {
  countryCode: string;
  jurisdictionType?: string | null;
  postalCode?: string | null;
  citySlug: string;
  shortCode?: string | null;
  parentSubdivisionCode?: string | null;
  parentSubdivisionName?: string | null;
}

export interface TenantRouteOptions {
  pathTemplate?: string | null;
  workerNameTemplate?: string | null;
}

export interface DerivedTenantRoute {
  countryCode: string;
  jurisdictionType: string;
  postalCode: string | null;
  citySlug: string;
  shortCode: string;
  parentSubdivisionCode: string | null;
  parentSubdivisionName: string | null;
  routeSegment: string;
  dispatcherKey: string;
  pathPrefix: string;
  workerName: string;
}

export function deriveTenantRoute(input: TenantRouteInput, options: TenantRouteOptions = {}): DerivedTenantRoute {
  const countryCode = normalizeTenantCountryCode(input.countryCode);
  const config = getTenantRoutingCountryConfig(countryCode);
  const jurisdictionType = normalizeTenantJurisdictionType(input.jurisdictionType, countryCode);
  const postalCode = normalizeTenantPostalCode(input.postalCode) || null;
  const citySlug = normalizeTenantCitySlug(input.citySlug);
  const shortCode = normalizeTenantShortCode(input.shortCode || postalCode || citySlug);
  const jurisdictionConfig = config?.jurisdictions[jurisdictionType as TenantJurisdictionType];
  const routeSegment = buildRouteSegment({
    citySlug,
    postalCode,
    shortCode,
    strategy: jurisdictionConfig?.routeSegmentStrategy ?? (postalCode ? "postal-slug" : "slug"),
  });
  const values = {
    countryCode,
    jurisdictionType,
    postalCode: postalCode ?? "",
    citySlug,
    shortCode,
    routeSegment,
    parentSubdivisionCode: normalizeTenantCitySlug(input.parentSubdivisionCode ?? ""),
    parentSubdivisionName: input.parentSubdivisionName?.trim() ?? "",
  };
  const pathTemplate = options.pathTemplate || config?.pathTemplate || "/{countryCode}/{jurisdictionType}/{routeSegment}";
  const workerNameTemplate =
    options.workerNameTemplate || config?.workerNameTemplate || "ciutatis-{countryCode}-{jurisdictionType}-{routeSegment}";
  const pathPrefix = normalizeTenantPathPrefix(renderTemplate(pathTemplate, values));
  const dispatcherKey = pathPrefix.replace(/^\/+/, "");

  return {
    countryCode,
    jurisdictionType,
    postalCode,
    citySlug,
    shortCode,
    parentSubdivisionCode: values.parentSubdivisionCode || null,
    parentSubdivisionName: values.parentSubdivisionName || null,
    routeSegment,
    dispatcherKey,
    pathPrefix,
    workerName: normalizeWorkerName(renderTemplate(workerNameTemplate, values)),
  };
}

export function deriveTenantDispatcherKey(countryCode: string, citySlug: string, shortCode: string) {
  return `${normalizeTenantCountryCode(countryCode)}/${normalizeTenantCitySlug(citySlug)}-${normalizeTenantShortCode(shortCode)}`;
}

export function deriveTenantPathPrefix(countryCode: string, citySlug: string, shortCode: string) {
  return `/${deriveTenantDispatcherKey(countryCode, citySlug, shortCode)}`;
}

export function deriveTenantPathPrefixFromDispatcherKey(dispatcherKey: string) {
  return dispatcherKey.startsWith("/") ? dispatcherKey : `/${dispatcherKey}`;
}

export function deriveTenantWorkerName(
  countryCode: string,
  citySlug: string,
  shortCode: string,
  template: string = "ciutatis-{countryCode}-{citySlug}-{shortCode}",
) {
  return renderTemplate(template, {
    countryCode: normalizeTenantCountryCode(countryCode),
    citySlug: normalizeTenantCitySlug(citySlug),
    shortCode: normalizeTenantShortCode(shortCode),
  });
}

export function deriveTenantUrl(
  routingMode: TenantRoutingMode,
  pathPrefix: string,
  hostname: string | null | undefined,
  baseDomain: string = "ciutatis.com",
) {
  if ((routingMode === "custom_domain" || routingMode === "subdomain") && hostname) {
    return `https://${hostname}`;
  }
  return `https://${baseDomain}${pathPrefix}`;
}

export function parseTenantRoutePathname(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  if (parts.length >= 3) {
    const [countryCode, jurisdictionType, routeSegment, ...restParts] = parts;
    if (!countryCode || !jurisdictionType || !routeSegment) return null;
    const normalizedCountryCode = normalizeTenantCountryCode(countryCode);
    const normalizedJurisdictionType = normalizeTenantJurisdictionType(jurisdictionType, normalizedCountryCode);
    const normalizedRouteSegment = normalizeTenantRouteSegment(routeSegment);
    const countryConfig = getTenantRoutingCountryConfig(normalizedCountryCode);
    const isConfiguredJurisdiction = Boolean(countryConfig?.jurisdictions[normalizedJurisdictionType as TenantJurisdictionType]);
    if (!normalizedCountryCode || !normalizedJurisdictionType || !normalizedRouteSegment) return null;
    if (!countryConfig || isConfiguredJurisdiction) {
      const postalSegmentMatch = /^([a-z0-9]*\d[a-z0-9]*)-([a-z0-9-]+)$/i.exec(normalizedRouteSegment);
      const postalCode = postalSegmentMatch ? normalizeTenantPostalCode(postalSegmentMatch[1]) : null;
      const citySlug = normalizeTenantCitySlug(postalSegmentMatch?.[2] ?? normalizedRouteSegment);
      const shortCode = normalizeTenantShortCode(postalCode || citySlug);
      const dispatcherKey = `${normalizedCountryCode}/${normalizedJurisdictionType}/${normalizedRouteSegment}`;
      const pathPrefix = deriveTenantPathPrefixFromDispatcherKey(dispatcherKey);
      const remainderPath = `/${restParts.join("/")}`.replace(/\/+$/, "") || "/";

      return {
        countryCode: normalizedCountryCode,
        jurisdictionType: normalizedJurisdictionType,
        postalCode,
        citySlug,
        shortCode,
        routeSegment: normalizedRouteSegment,
        dispatcherKey,
        pathPrefix,
        remainderPath,
      };
    }
  }

  const [countryCode, citySegment, ...restParts] = parts;
  const cityMatch = /^([a-z0-9-]+)-([a-z0-9]+)$/i.exec(citySegment ?? "");
  if (!countryCode || !cityMatch) return null;

  const citySlug = normalizeTenantCitySlug(cityMatch[1]!);
  const shortCode = normalizeTenantShortCode(cityMatch[2]!);
  const normalizedCountryCode = normalizeTenantCountryCode(countryCode);
  const dispatcherKey = deriveTenantDispatcherKey(normalizedCountryCode, citySlug, shortCode);
  const pathPrefix = deriveTenantPathPrefixFromDispatcherKey(dispatcherKey);
  const remainderPath = `/${restParts.join("/")}`.replace(/\/+$/, "") || "/";

  return {
    countryCode: normalizedCountryCode,
    citySlug,
    shortCode,
    dispatcherKey,
    pathPrefix,
    remainderPath,
  };
}
