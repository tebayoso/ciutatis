import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PUBLIC_REQUEST_CATEGORIES,
  type PublicInstitutionSummary,
  type PublicRequestCreateInput,
  type PublicRequestStatus,
  type PublicSubmissionMode,
} from "@paperclipai/shared";
import { ArrowRight, Building2, Clock3, LockKeyhole, MapPin, Search, ShieldCheck, Ticket } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { publicPortalApi } from "../api/publicPortal";
import { authApi } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";
import {
  getPortalLocale,
  portalInstitutionPath,
  portalPath,
  portalRequestPath,
  PORTAL_CATEGORY_LABELS,
  PORTAL_COPY,
  PORTAL_STATUS_LABELS,
  PORTAL_STATUS_OPTIONS,
  PORTAL_STATUS_TONE,
  type PortalLocale,
} from "../lib/publicPortalUi";

const RECOVERY_TOKEN_STORAGE_PREFIX = "ciutatis.portal.recovery.";

function saveRecoveryToken(publicId: string, token: string) {
  try {
    globalThis.localStorage?.setItem(`${RECOVERY_TOKEN_STORAGE_PREFIX}${publicId}`, token);
  } catch {
    // Ignore local storage failures in restricted browsing contexts.
  }
}

function RequestStatusPill({ locale, status }: { locale: PortalLocale; status: PublicRequestStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${PORTAL_STATUS_TONE[status]}`}
    >
      {PORTAL_STATUS_LABELS[locale][status]}
    </span>
  );
}

function RequestCard({
  locale,
  request,
}: {
  locale: PortalLocale;
  request: Awaited<ReturnType<typeof publicPortalApi.listRequests>>[number];
}) {
  return (
    <Link
      to={portalRequestPath(locale, request.publicId)}
      className="group block rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-slate-900/20 hover:shadow-[0_26px_90px_-45px_rgba(15,23,42,0.5)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <RequestStatusPill locale={locale} status={request.publicStatus} />
        <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
          {PORTAL_CATEGORY_LABELS[locale][request.category]}
        </span>
        <span className="ml-auto text-[11px] uppercase tracking-[0.16em] text-slate-500">
          {request.publicId}
        </span>
      </div>
      <h3
        className="mt-4 text-2xl leading-tight text-slate-950"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        {request.publicTitle}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{request.publicSummary}</p>
      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {request.institutionName}
        </span>
        {request.locationLabel ? (
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {request.locationLabel}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-2">
          <Clock3 className="h-4 w-4" />
          {new Date(request.updatedAt).toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        Open public case
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function findInstitutionById(institutions: PublicInstitutionSummary[], institutionId: string | null) {
  if (!institutionId) return null;
  return institutions.find((entry) => entry.id === institutionId) ?? null;
}

export function PublicPortalPage() {
  const params = useParams<{ institutionSlug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = getPortalLocale(location.pathname);
  const copy = PORTAL_COPY[locale];
  const routeInstitutionSlug = params.institutionSlug ?? null;
  const authHref = `/auth?mode=signup&context=portal&next=${encodeURIComponent(location.pathname)}`;

  const [submissionMode, setSubmissionMode] = useState<PublicSubmissionMode>("account");
  const [formInstitutionId, setFormInstitutionId] = useState<string | null>(null);
  const [feedInstitutionSlug, setFeedInstitutionSlug] = useState<string>(routeInstitutionSlug ?? "");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof PUBLIC_REQUEST_CATEGORIES)[number]>("infrastructure");
  const [locationLabel, setLocationLabel] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });

  const institutionsQuery = useQuery({
    queryKey: queryKeys.publicPortal.institutions,
    queryFn: () => publicPortalApi.listInstitutions(),
  });

  const routeInstitution = useMemo(() => {
    if (!routeInstitutionSlug) return null;
    return institutionsQuery.data?.find((entry) => entry.slug === routeInstitutionSlug) ?? null;
  }, [institutionsQuery.data, routeInstitutionSlug]);

  useEffect(() => {
    if (routeInstitution) {
      setFormInstitutionId(routeInstitution.id);
      setFeedInstitutionSlug(routeInstitution.slug);
      return;
    }

    if (!formInstitutionId && institutionsQuery.data?.[0]) {
      setFormInstitutionId(institutionsQuery.data[0].id);
    }
  }, [formInstitutionId, institutionsQuery.data, routeInstitution]);

  const selectedInstitution = findInstitutionById(institutionsQuery.data ?? [], formInstitutionId);
  const activeInstitutionSlug = routeInstitutionSlug ?? (feedInstitutionSlug || undefined);

  const requestsQuery = useQuery({
    queryKey: queryKeys.publicPortal.requests({
      institutionSlug: activeInstitutionSlug,
      publicStatus: selectedStatus || undefined,
      category: undefined,
      q: searchQuery || undefined,
    }),
    queryFn: () =>
      publicPortalApi.listRequests({
        institutionSlug: activeInstitutionSlug,
        publicStatus: selectedStatus || undefined,
        q: searchQuery || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (input: PublicRequestCreateInput) => publicPortalApi.createRequest(input),
    onSuccess: async (result) => {
      setFormError(null);
      if (result.recoveryToken) {
        saveRecoveryToken(result.publicId, result.recoveryToken);
        setRecoveryNotice(copy.copyRecovery);
      } else {
        setRecoveryNotice(null);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.publicPortal.requests({}) });
      navigate(portalRequestPath(locale, result.publicId));
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Failed to publish request.");
    },
  });

  const submitLabel =
    createMutation.isPending ? "Publishing…" : copy.submit;

  const heroInstitutionName = routeInstitution?.name ?? copy.allInstitutions;
  const showingRouteInstitutionMissing =
    Boolean(routeInstitutionSlug) && !routeInstitution && institutionsQuery.isSuccess;

  return (
    <div className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,#f8f5ef_0%,#fbfaf7_32%,#eef3f7_100%)] text-slate-950">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-white/70 bg-white/55 px-5 py-4 shadow-[0_28px_90px_-52px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {copy.eyebrow}
              </div>
              <div
                className="mt-2 text-3xl leading-tight sm:text-5xl"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {routeInstitution ? `${routeInstitution.name} Portal` : copy.title}
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {routeInstitution ? copy.intro : copy.intro}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-slate-600">
                {heroInstitutionName}
              </span>
              <Button variant="outline" asChild className="rounded-full border-slate-300 bg-white/85">
                <Link to={portalPath(locale)}>{copy.backToPortal}</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.18fr)_420px]">
          <section className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[28px] border border-slate-200/80 bg-slate-950 p-5 text-white">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">{copy.feedTitle}</div>
                <div
                  className="mt-3 text-3xl"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  {requestsQuery.data?.length ?? 0}
                </div>
                <p className="mt-3 text-sm leading-6 text-white/72">{copy.feedBody}</p>
              </div>
              <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{copy.signedIn}</div>
                <div className="mt-3 text-lg font-semibold text-slate-900">
                  {sessionQuery.data?.user?.email ?? "Guest / anonymous"}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {copy.privacyNote}
                </p>
              </div>
              <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Visibility</div>
                <div className="mt-3 inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Public by default
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Requests publish after privacy filtering. Contact details stay off the board.
                </p>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_28px_90px_-60px_rgba(15,23,42,0.45)] sm:p-7">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{copy.feedTitle}</div>
                  <h2
                    className="mt-2 text-3xl text-slate-950"
                    style={{ fontFamily: "Fraunces, serif" }}
                  >
                    {routeInstitution ? `${routeInstitution.name} ledger` : copy.feedTitle}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_200px_180px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={copy.searchPlaceholder}
                      className="rounded-full border-slate-200 bg-slate-50 pl-9"
                    />
                  </div>
                  <select
                    value={routeInstitutionSlug ?? feedInstitutionSlug}
                    onChange={(event) => setFeedInstitutionSlug(event.target.value)}
                    disabled={Boolean(routeInstitutionSlug)}
                    className="h-11 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-slate-900"
                  >
                    <option value="">{copy.allInstitutions}</option>
                    {(institutionsQuery.data ?? []).map((institution) => (
                      <option key={institution.id} value={institution.slug}>
                        {institution.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                    className="h-11 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-slate-900"
                  >
                    <option value="">{copy.allStatuses}</option>
                    {PORTAL_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {PORTAL_STATUS_LABELS[locale][status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {showingRouteInstitutionMissing ? (
                <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                  {copy.cityMissing}
                </div>
              ) : null}

              <div className="mt-6 space-y-4">
                {requestsQuery.isLoading ? (
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                    Loading public ledger…
                  </div>
                ) : requestsQuery.data && requestsQuery.data.length > 0 ? (
                  requestsQuery.data.map((request) => (
                    <RequestCard key={request.publicId} locale={locale} request={request} />
                  ))
                ) : (
                  <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center">
                    <div
                      className="text-2xl text-slate-950"
                      style={{ fontFamily: "Fraunces, serif" }}
                    >
                      {copy.boardEmpty}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{copy.boardEmptyHint}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[32px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.42)]">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                {([
                  ["account", copy.accountMode],
                  ["guest", copy.guestMode],
                  ["anonymous", copy.anonymousMode],
                ] as Array<[PublicSubmissionMode, string]>).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-sm transition ${
                      submissionMode === mode ? "bg-slate-950 text-white" : "text-slate-500 hover:text-slate-900"
                    }`}
                    onClick={() => setSubmissionMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <h2
                className="mt-5 text-3xl text-slate-950"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {copy.intakeTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{copy.intakeBody}</p>

              <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
                {submissionMode === "account"
                  ? copy.accountHint
                  : submissionMode === "guest"
                    ? copy.guestHint
                    : copy.anonymousHint}
              </div>

              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedInstitution) {
                    setFormError("Choose a city or institution before publishing.");
                    return;
                  }
                  if (submissionMode === "account" && !sessionQuery.data) {
                    navigate(authHref);
                    return;
                  }

                  createMutation.mutate({
                    institutionId: selectedInstitution.id,
                    submissionMode,
                    title,
                    description,
                    category,
                    locationLabel: locationLabel || null,
                    contactName: submissionMode === "guest" ? contactName : null,
                    contactEmail: submissionMode === "guest" ? contactEmail : null,
                    locale,
                    sourcePath: location.pathname,
                  });
                }}
              >
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {copy.institutionLabel}
                  </label>
                  <select
                    value={formInstitutionId ?? ""}
                    onChange={(event) => {
                      const nextId = event.target.value || null;
                      const nextInstitution = findInstitutionById(institutionsQuery.data ?? [], nextId);
                      setFormInstitutionId(nextId);
                      if (!routeInstitutionSlug && nextInstitution) {
                        setFeedInstitutionSlug(nextInstitution.slug);
                      }
                    }}
                    disabled={Boolean(routeInstitutionSlug)}
                    className="h-11 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-slate-950"
                  >
                    <option value="">{copy.allInstitutions}</option>
                    {(institutionsQuery.data ?? []).map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {copy.categoryLabel}
                    </label>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value as (typeof PUBLIC_REQUEST_CATEGORIES)[number])}
                      className="h-11 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-slate-950"
                    >
                      {PUBLIC_REQUEST_CATEGORIES.map((entry) => (
                        <option key={entry} value={entry}>
                          {PORTAL_CATEGORY_LABELS[locale][entry]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {copy.locationLabel}
                    </label>
                    <Input
                      value={locationLabel}
                      onChange={(event) => setLocationLabel(event.target.value)}
                      className="rounded-[18px] border-slate-200 bg-slate-50"
                      placeholder="Street, block, park, building"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {copy.titleLabel}
                  </label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="rounded-[18px] border-slate-200 bg-slate-50"
                    placeholder="Street lights out for three blocks"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {copy.descriptionLabel}
                  </label>
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-32 rounded-[22px] border-slate-200 bg-slate-50"
                    placeholder="Describe what happened, what residents are seeing, and what should be routed or solved."
                  />
                </div>

                {submissionMode === "guest" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {copy.contactNameLabel}
                      </label>
                      <Input
                        value={contactName}
                        onChange={(event) => setContactName(event.target.value)}
                        className="rounded-[18px] border-slate-200 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {copy.contactEmailLabel}
                      </label>
                      <Input
                        type="email"
                        value={contactEmail}
                        onChange={(event) => setContactEmail(event.target.value)}
                        className="rounded-[18px] border-slate-200 bg-slate-50"
                      />
                    </div>
                  </div>
                ) : null}

                {submissionMode === "account" && !sessionQuery.data ? (
                  <Button type="button" variant="outline" className="w-full rounded-full" asChild>
                    <Link to={authHref}>{copy.signInCta}</Link>
                  </Button>
                ) : null}

                {formError ? <p className="text-sm text-rose-700">{formError}</p> : null}
                {recoveryNotice ? (
                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {recoveryNotice}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
                  disabled={createMutation.isPending}
                >
                  <Ticket className="mr-2 h-4 w-4" />
                  {submitLabel}
                </Button>
              </form>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
                <div className="inline-flex items-center gap-2 font-semibold text-slate-900">
                  <LockKeyhole className="h-4 w-4 text-slate-700" />
                  PII protection
                </div>
                <p className="mt-2">{copy.privacyNote}</p>
              </div>

              {selectedInstitution ? (
                <div className="mt-4 text-sm text-slate-500">
                  <Link
                    to={portalInstitutionPath(locale, selectedInstitution.slug)}
                    className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
                  >
                    {copy.openCityPortal}
                  </Link>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
