import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Boxes, Cloud, Compass, ServerCrash } from "lucide-react";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { tenantInstancesApi } from "@/api/tenantInstances";
import { queryKeys } from "@/lib/queryKeys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function metricTone(value: number, kind: "healthy" | "warning" | "danger" = "healthy") {
  if (value === 0) return "text-muted-foreground";
  if (kind === "danger") return "text-destructive";
  if (kind === "warning") return "text-amber-700";
  return "text-foreground";
}

export function InstanceAdminOverview() {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Instance Settings" },
      { label: "Control Panel" },
    ]);
  }, [setBreadcrumbs]);

  const overviewQuery = useQuery({
    queryKey: queryKeys.instance.adminOverview,
    queryFn: () => tenantInstancesApi.getOverview(),
  });

  const tenantsQuery = useQuery({
    queryKey: queryKeys.instance.tenants,
    queryFn: () => tenantInstancesApi.list(),
  });

  const opsInbox = useMemo(() => {
    const tenants = tenantsQuery.data ?? [];
    return tenants.filter((tenant) =>
      tenant.status === "error" ||
      tenant.status === "provisioning" ||
      tenant.bootstrapStatus === "pending",
    );
  }, [tenantsQuery.data]);

  const overview = overviewQuery.data;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Administrator Control Panel</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          The instance shell runs at <span className="font-mono text-xs">admin.ciutatis.com</span>. Use this panel to supervise tenant rollout, Cloudflare connectivity, and cross-tenant operational drift.
        </p>
      </div>

      {overviewQuery.isError ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">Overview unavailable</CardTitle>
            <CardDescription>
              {overviewQuery.error instanceof Error ? overviewQuery.error.message : "Failed to load instance overview"}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total tenants</CardDescription>
            <CardTitle className="text-3xl">{overview?.tenants.total ?? "—"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <div className={metricTone(overview?.tenants.active ?? 0)}>Active: {overview?.tenants.active ?? 0}</div>
            <div className={metricTone(overview?.tenants.provisioning ?? 0, "warning")}>Provisioning: {overview?.tenants.provisioning ?? 0}</div>
            <div className={metricTone(overview?.tenants.error ?? 0, "danger")}>Errors: {overview?.tenants.error ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Bootstrap pending</CardDescription>
            <CardTitle className="text-3xl">{overview?.tenants.bootstrapPending ?? "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tenants that have infra but still need their first operator onboarded.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Provisioning jobs</CardDescription>
            <CardTitle className="text-3xl">{overview ? overview.jobs.queued + overview.jobs.running : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <div>Queued: {overview?.jobs.queued ?? 0}</div>
            <div>Running: {overview?.jobs.running ?? 0}</div>
            <div className={metricTone(overview?.jobs.failed ?? 0, "danger")}>Failed: {overview?.jobs.failed ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Cloudflare</CardDescription>
            <CardTitle className="text-3xl">{overview?.cloudflare.enabled ? "Live" : "Off"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant={overview?.cloudflare.apiTokenConfigured ? "default" : "outline"}>
                Token {overview?.cloudflare.apiTokenConfigured ? "configured" : "missing"}
              </Badge>
              <Badge variant={overview?.cloudflare.lastValidationError ? "destructive" : "secondary"}>
                {overview?.cloudflare.lastValidationError ? "Needs attention" : "Healthy"}
              </Badge>
            </div>
            <div className="text-muted-foreground">
              Namespace <span className="font-mono text-xs">{overview?.cloudflare.dispatchNamespace ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ops inbox</CardTitle>
            <CardDescription>
              First-pass triage for tenants that need intervention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {opsInbox.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No tenant-level interventions are pending.
              </div>
            ) : null}
            {opsInbox.map((tenant) => (
              <div key={tenant.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{tenant.name}</span>
                  <Badge variant={tenant.status === "error" ? "destructive" : "secondary"}>{tenant.status}</Badge>
                  <Badge variant="outline">bootstrap {tenant.bootstrapStatus}</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{tenant.pathPrefix}</span>
                  {tenant.lastDeploymentError ? (
                    <span className="ml-2 text-destructive">{tenant.lastDeploymentError}</span>
                  ) : (
                    <span className="ml-2">Latest job: {tenant.latestJob?.status ?? "none yet"}</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent deployments</CardTitle>
            <CardDescription>
              Cross-tenant deployment activity and validation fallout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(overview?.recentJobs ?? []).map((job) => (
              <div key={job.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{job.tenantName}</span>
                  <Badge variant={job.status === "failed" ? "destructive" : job.status === "succeeded" ? "default" : "secondary"}>
                    {job.status}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Step <span className="font-mono text-xs">{job.step}</span>
                </div>
                {job.errorMessage ? (
                  <div className="mt-2 text-sm text-destructive">{job.errorMessage}</div>
                ) : null}
              </div>
            ))}
            {!overview?.recentJobs.length ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No provisioning jobs recorded yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connectivity warnings</CardTitle>
            <CardDescription>
              Instance-level blockers surfaced from Cloudflare validation and routing state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(overview?.warnings ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No instance-wide warnings are active.
              </div>
            ) : null}
            {(overview?.warnings ?? []).map((warning) => (
              <div key={warning} className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Topology snapshot</CardTitle>
            <CardDescription>
              Current host split between admin, public landing, and tenant dispatch.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Cloud className="h-4 w-4" />
                Admin shell
              </div>
              <div className="mt-2 font-mono text-xs text-muted-foreground">{overview?.cloudflare.adminHostname ?? "admin.ciutatis.com"}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Boxes className="h-4 w-4" />
                Public landing
              </div>
              <div className="mt-2 font-mono text-xs text-muted-foreground">{overview?.cloudflare.landingHostname ?? "ciutatis.com"}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ServerCrash className="h-4 w-4" />
                Apex dispatcher
              </div>
              <div className="mt-2 font-mono text-xs text-muted-foreground">{overview?.cloudflare.publicHostname ?? "ciutatis.com"}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
