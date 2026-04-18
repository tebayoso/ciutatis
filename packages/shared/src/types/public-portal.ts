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
