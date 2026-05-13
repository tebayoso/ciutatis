export const TENANT_JURISDICTION_TYPES = [
  "nacion",
  "provincia",
  "ciudad-autonoma",
  "municipio",
  "partido",
  "departamento",
  "comuna",
  "barrio",
] as const;

export type TenantJurisdictionType = typeof TENANT_JURISDICTION_TYPES[number];

export type TenantRouteSegmentStrategy = "slug" | "postal-slug" | "slug-postal" | "legacy-city-short-code";

export interface TenantJurisdictionRoutingConfig {
  type: TenantJurisdictionType;
  label: string;
  pluralLabel: string;
  description: string;
  routeSegmentStrategy: TenantRouteSegmentStrategy;
  requiresPostalCode: boolean;
}

export interface TenantRouteSeed {
  name: string;
  municipalityName: string;
  countryCode: string;
  jurisdictionType: TenantJurisdictionType;
  postalCode: string | null;
  citySlug: string;
  shortCode: string;
  parentSubdivisionCode: string | null;
  parentSubdivisionName: string | null;
  pathPrefix: string;
  dispatcherKey: string;
}

export interface TenantCountryRoutingConfig {
  countryCode: string;
  countryName: string;
  defaultJurisdictionType: TenantJurisdictionType;
  pathTemplate: string;
  workerNameTemplate: string;
  jurisdictionAliases: Record<string, TenantJurisdictionType>;
  jurisdictions: Record<TenantJurisdictionType, TenantJurisdictionRoutingConfig>;
  launchTenants: TenantRouteSeed[];
}
