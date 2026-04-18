import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Clock3, LockKeyhole, MapPin, MessageSquareText } from "lucide-react";
import { Link, useLocation, useParams } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { authApi } from "../api/auth";
import { publicPortalApi } from "../api/publicPortal";
import { queryKeys } from "../lib/queryKeys";
import {
  getPortalLocale,
  portalPath,
  PORTAL_CATEGORY_LABELS,
  PORTAL_COPY,
  PORTAL_STATUS_LABELS,
  PORTAL_STATUS_TONE,
  type PortalLocale,
} from "../lib/publicPortalUi";

const RECOVERY_TOKEN_STORAGE_PREFIX = "ciutatis.portal.recovery.";

function readRecoveryToken(publicId: string) {
  try {
    return globalThis.localStorage?.getItem(`${RECOVERY_TOKEN_STORAGE_PREFIX}${publicId}`) ?? "";
  } catch {
    return "";
  }
}

function saveRecoveryToken(publicId: string, token: string) {
  try {
    globalThis.localStorage?.setItem(`${RECOVERY_TOKEN_STORAGE_PREFIX}${publicId}`, token);
  } catch {
    // Ignore local storage failures.
  }
}

function RequestStatusPill({ locale, status }: { locale: PortalLocale; status: keyof typeof PORTAL_STATUS_TONE }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${PORTAL_STATUS_TONE[status]}`}
    >
      {PORTAL_STATUS_LABELS[locale][status]}
    </span>
  );
}

export function PublicPortalRequestPage() {
  const params = useParams<{ publicId?: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const locale = getPortalLocale(location.pathname);
  const copy = PORTAL_COPY[locale];
  const publicId = params.publicId ?? "";
  const authHref = `/auth?mode=signup&context=portal&next=${encodeURIComponent(location.pathname)}`;

  const [recoveryToken, setRecoveryToken] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.publicPortal.detail(publicId),
    queryFn: () => publicPortalApi.getRequest(publicId),
    enabled: publicId.length > 0,
  });

  useEffect(() => {
    if (!publicId) return;
    const token = readRecoveryToken(publicId);
    if (token) setRecoveryToken(token);
  }, [publicId]);

  const replyMutation = useMutation({
    mutationFn: () =>
      publicPortalApi.addComment(publicId, {
        body: replyBody,
        recoveryToken: recoveryToken || null,
      }),
    onSuccess: async () => {
      setReplyError(null);
      if (recoveryToken) saveRecoveryToken(publicId, recoveryToken);
      setReplyBody("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.publicPortal.detail(publicId) });
    },
    onError: (error) => {
      setReplyError(error instanceof Error ? error.message : "Failed to publish follow-up.");
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,#f8f5ef_0%,#fbfaf7_32%,#eef3f7_100%)] px-4 py-10 text-sm text-slate-500">
        Loading public request…
      </div>
    );
  }

  if (!detailQuery.data) {
    return (
      <div className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,#f8f5ef_0%,#fbfaf7_32%,#eef3f7_100%)] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white/92 p-8 text-center shadow-[0_28px_90px_-60px_rgba(15,23,42,0.45)]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Public request</div>
          <h1 className="mt-3 text-4xl text-slate-950" style={{ fontFamily: "Fraunces, serif" }}>
            {copy.requestMissing}
          </h1>
          <div className="mt-6">
            <Button asChild className="rounded-full bg-slate-950 text-white">
              <Link to={portalPath(locale)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {copy.backToPortal}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const detail = detailQuery.data;
  const canReplyWithAccount = detail.replyMode === "account" && detail.viewerCanReply;
  const canReplyWithGuest = detail.replyMode === "guest";
  const canReply = canReplyWithAccount || canReplyWithGuest;

  return (
    <div className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,#f8f5ef_0%,#fbfaf7_32%,#eef3f7_100%)] text-slate-950">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-white/70 bg-white/55 px-5 py-4 shadow-[0_28px_90px_-52px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {detail.publicId}
              </div>
              <h1 className="mt-2 text-4xl leading-tight text-slate-950 sm:text-5xl" style={{ fontFamily: "Fraunces, serif" }}>
                {detail.publicTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{detail.publicDescription}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RequestStatusPill locale={locale} status={detail.publicStatus} />
              <Button variant="outline" asChild className="rounded-full border-slate-300 bg-white/85">
                <Link to={portalPath(locale)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {copy.backToPortal}
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.16fr)_380px]">
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[26px] border border-slate-200 bg-white/92 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Institution</div>
                <div className="mt-3 inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Building2 className="h-5 w-5 text-slate-700" />
                  {detail.institutionName}
                </div>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-white/92 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Category</div>
                <div className="mt-3 text-lg font-semibold text-slate-900">
                  {PORTAL_CATEGORY_LABELS[locale][detail.category]}
                </div>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-white/92 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Updated</div>
                <div className="mt-3 inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Clock3 className="h-5 w-5 text-slate-700" />
                  {new Date(detail.updatedAt).toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_28px_90px_-60px_rgba(15,23,42,0.45)]">
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-5 w-5 text-slate-700" />
                <h2 className="text-3xl text-slate-950" style={{ fontFamily: "Fraunces, serif" }}>
                  Public timeline
                </h2>
              </div>
              <div className="mt-6 space-y-4">
                {detail.updates.map((update) => (
                  <div key={update.id} className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">{update.actorLabel}</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        {new Date(update.createdAt).toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{update.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[32px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.42)]">
              <h2 className="text-3xl text-slate-950" style={{ fontFamily: "Fraunces, serif" }}>
                {copy.followUpTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {detail.replyMode === "account"
                  ? copy.followUpHintAccount
                  : detail.replyMode === "guest"
                    ? copy.followUpHintGuest
                    : copy.followUpHintAnonymous}
              </p>

              <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
                <div className="inline-flex items-center gap-2 font-semibold text-slate-900">
                  <LockKeyhole className="h-4 w-4 text-slate-700" />
                  PII protection
                </div>
                <p className="mt-2">{copy.privacyNote}</p>
              </div>

              {detail.replyMode === "account" && !canReplyWithAccount ? (
                <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
                  {sessionQuery.data ? (
                    copy.followUpHintAccount
                  ) : (
                    <Button asChild className="rounded-full bg-slate-950 text-white">
                      <Link to={authHref}>{copy.signInCta}</Link>
                    </Button>
                  )}
                </div>
              ) : null}

              {detail.replyMode === "guest" ? (
                <div className="mt-5">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {copy.recoveryCode}
                  </label>
                  <Input
                    value={recoveryToken}
                    onChange={(event) => setRecoveryToken(event.target.value)}
                    className="rounded-[18px] border-slate-200 bg-slate-50"
                  />
                </div>
              ) : null}

              {canReply ? (
                <form
                  className="mt-5 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    replyMutation.mutate();
                  }}
                >
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {copy.replyBody}
                    </label>
                    <Textarea
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      className="min-h-32 rounded-[22px] border-slate-200 bg-slate-50"
                      placeholder="Add clarifications, dates, photos not yet uploaded, or routing context."
                    />
                  </div>
                  {replyError ? <p className="text-sm text-rose-700">{replyError}</p> : null}
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
                    disabled={replyMutation.isPending}
                  >
                    {replyMutation.isPending ? "Publishing…" : copy.submitReply}
                  </Button>
                </form>
              ) : null}

              {detail.locationLabel ? (
                <div className="mt-6 inline-flex items-center gap-2 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" />
                  {detail.locationLabel}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
