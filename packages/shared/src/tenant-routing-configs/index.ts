import { ARGENTINA_TENANT_ROUTING_CONFIG } from "./ar.js";
import { US_TENANT_ROUTING_CONFIG } from "./us.js";
import type { TenantCountryRoutingConfig } from "./types.js";

export const TENANT_ROUTING_COUNTRY_CONFIGS: Record<string, TenantCountryRoutingConfig> = {
  ar: ARGENTINA_TENANT_ROUTING_CONFIG,
  us: US_TENANT_ROUTING_CONFIG,
};

export function getTenantRoutingCountryConfig(countryCode: string | null | undefined) {
  const normalized = countryCode?.trim().toLowerCase();
  return normalized ? TENANT_ROUTING_COUNTRY_CONFIGS[normalized] ?? null : null;
}

export { ARGENTINA_TENANT_ROUTING_CONFIG } from "./ar.js";
export { US_TENANT_ROUTING_CONFIG } from "./us.js";
export {
  TENANT_JURISDICTION_TYPES,
  type TenantCountryRoutingConfig,
  type TenantJurisdictionRoutingConfig,
  type TenantJurisdictionType,
  type TenantRouteSeed,
  type TenantRouteSegmentStrategy,
} from "./types.js";
