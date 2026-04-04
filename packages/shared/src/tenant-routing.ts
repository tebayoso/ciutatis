import type { TenantRoutingMode } from "./constants.js";

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
