import type {
  PublicInstitutionSummary,
  PublicRequestCommentInput,
  PublicRequestCreateInput,
  PublicRequestCreateResult,
  PublicRequestDetail,
  PublicRequestSummary,
} from "@paperclipai/shared";
import { api } from "./client";

export const publicPortalApi = {
  listInstitutions: () => api.get<PublicInstitutionSummary[]>("/public/institutions"),
  getInstitution: (slug: string) =>
    api.get<PublicInstitutionSummary>(`/public/institutions/${encodeURIComponent(slug)}`),
  listRequests: (filters?: {
    institutionSlug?: string;
    publicStatus?: string;
    category?: string;
    q?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.institutionSlug) params.set("institutionSlug", filters.institutionSlug);
    if (filters?.publicStatus) params.set("publicStatus", filters.publicStatus);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.q) params.set("q", filters.q);
    const qs = params.toString();
    return api.get<PublicRequestSummary[]>(`/public/requests${qs ? `?${qs}` : ""}`);
  },
  getRequest: (publicId: string) =>
    api.get<PublicRequestDetail>(`/public/requests/${encodeURIComponent(publicId)}`),
  createRequest: (data: PublicRequestCreateInput) =>
    api.post<PublicRequestCreateResult>("/public/requests", data),
  addComment: (publicId: string, data: PublicRequestCommentInput) =>
    api.post<{ ok: true }>(`/public/requests/${encodeURIComponent(publicId)}/comments`, data),
};
