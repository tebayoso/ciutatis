import type {
  PublicPortalLocale,
  PublicRequestCategory,
  PublicRequestStatus,
  PublicRequestUpdateKind,
  PublicSubmissionMode,
} from "../public-portal.js";

export interface PublicInstitutionSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brandColor: string | null;
  logoUrl: string | null;
  issuePrefix: string;
}

export interface PublicPlaceSummary {
  id: string;
  name: string;
  municipalityName: string;
  countryCode: string;
  countryName: string | null;
  jurisdictionType: string;
  jurisdictionLabel: string;
  postalCode: string | null;
  citySlug: string;
  parentSubdivisionName: string | null;
  pathPrefix: string;
  url: string;
  // Geo anchor from OSM; null for places created before capture.
  latitude: number | null;
  longitude: number | null;
  osmType: string | null;
  osmId: string | null;
}

// Canonical administrative entity from the geo reference layer (geo_entities).
export interface PublicGeoEntity {
  id: string;
  countryCode: string;
  level: string; // pais | provincia | departamento | municipio | localidad
  jurisdictionType: string;
  name: string;
  slug: string;
  pathPrefix: string;
  parentId: string | null;
  provinceName: string | null;
  parentName: string | null;
  lat: number | null;
  lon: number | null;
  osmType: string | null;
  osmId: string | null;
  claimed: boolean;
  category: string | null;
}

export interface PublicGeoEntityDetail extends PublicGeoEntity {
  // Breadcrumb chain, outermost first (pais → ... → immediate parent).
  parents: PublicGeoEntity[];
  childCount: number;
}

export interface PublicGeoChildrenPage {
  total: number;
  offset: number;
  items: PublicGeoEntity[];
}

export type PublicSearchResult =
  | (PublicInstitutionSummary & { kind: "institution" })
  | (PublicPlaceSummary & { kind: "place" });

export interface PublicRequestSummary {
  publicId: string;
  issueId: string;
  institutionId: string;
  institutionName: string;
  institutionSlug: string;
  publicTitle: string;
  publicSummary: string;
  publicStatus: PublicRequestStatus;
  category: PublicRequestCategory;
  locationLabel: string | null;
  submissionMode: PublicSubmissionMode;
  piiDetected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicRequestUpdate {
  id: string;
  kind: PublicRequestUpdateKind;
  actorLabel: string;
  body: string;
  createdAt: string;
}

export interface PublicRequestDetail extends PublicRequestSummary {
  publicDescription: string;
  updates: PublicRequestUpdate[];
  replyMode: "account" | "guest" | "none";
  viewerCanReply: boolean;
}

export interface PublicRequestCreateInput {
  institutionId?: string | null;
  institutionSlug?: string | null;
  submissionMode: PublicSubmissionMode;
  title: string;
  description: string;
  category: PublicRequestCategory;
  locationLabel?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  locale: PublicPortalLocale;
  sourcePath: string;
}

export interface PublicRequestCreateResult {
  publicId: string;
  identifier: string | null;
  recoveryToken: string | null;
}

export interface PublicRequestCommentInput {
  body: string;
  recoveryToken?: string | null;
}
