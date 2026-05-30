import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ARGENTINA_TENANT_ROUTING_CONFIG,
  deriveTenantRoute,
  type CreateTenantInstance,
  type TenantInstance,
  type UpdateTenantInstance,
} from "@paperclipai/shared";
import { Archive, Building2, ExternalLink, MapPinned, PauseCircle, PlayCircle, RefreshCcw, Router, Save } from "lucide-react";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { tenantInstancesApi } from "@/api/tenantInstances";
import { queryKeys } from "@/lib/queryKeys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DraftForm = {
  name: string;
  municipalityName: string;
  countryCode: string;
  jurisdictionType: string;
  postalCode: string;
  citySlug: string;
  shortCode: string;
  parentSubdivisionCode: string;
  parentSubdivisionName: string;
  routingMode: "path" | "subdomain" | "custom_domain";
  hostname: string;
  notes: string;
};

const ARGENTINA_LAUNCH_TENANT = ARGENTINA_TENANT_ROUTING_CONFIG.launchTenants[0]!;

const EMPTY_FORM: DraftForm = {
  name: ARGENTINA_LAUNCH_TENANT.name,
  municipalityName: ARGENTINA_LAUNCH_TENANT.municipalityName,
  countryCode: ARGENTINA_LAUNCH_TENANT.countryCode,
  jurisdictionType: ARGENTINA_LAUNCH_TENANT.jurisdictionType,
  postalCode: ARGENTINA_LAUNCH_TENANT.postalCode ?? "",
  citySlug: ARGENTINA_LAUNCH_TENANT.citySlug,
  shortCode: "",
  parentSubdivisionCode: ARGENTINA_LAUNCH_TENANT.parentSubdivisionCode ?? "",
  parentSubdivisionName: ARGENTINA_LAUNCH_TENANT.parentSubdivisionName ?? "",
  routingMode: "path",
  hostname: "",
  notes: "",
};

const ARGENTINA_JURISDICTIONS = Object.values(ARGENTINA_TENANT_ROUTING_CONFIG.jurisdictions);

function buildCreatePayload(draft: DraftForm): CreateTenantInstance {
  return {
    name: draft.name,
    municipalityName: draft.municipalityName,
    countryCode: draft.countryCode,
    jurisdictionType: draft.jurisdictionType,
    postalCode: draft.postalCode.trim() || undefined,
    citySlug: draft.citySlug,
    shortCode: draft.shortCode.trim() || undefined,
    parentSubdivisionCode: draft.parentSubdivisionCode.trim() || undefined,
    parentSubdivisionName: draft.parentSubdivisionName.trim() || undefined,
    routingMode: draft.routingMode,
    hostname: draft.hostname.trim() || undefined,
    notes: draft.notes.trim() || undefined,
  };
}

function statusVariant(status: TenantInstance["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "default";
  if (status === "error") return "destructive";
  if (status === "archived") return "outline";
  return "secondary";
}

export function InstanceTenants() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftForm>(EMPTY_FORM);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [baseDomain, setBaseDomain] = useState("ciutatis.com");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Instance Settings" },
      { label: "Tenants" },
    ]);
  }, [setBreadcrumbs]);

  const tenantsQuery = useQuery({
    queryKey: queryKeys.instance.tenants,
    queryFn: () => tenantInstancesApi.list(),
  });

  const provisioningQuery = useQuery({
    queryKey: queryKeys.instance.tenantProvisioning,
    queryFn: () => tenantInstancesApi.getProvisioning(),
  });

  useEffect(() => {
    if (provisioningQuery.data?.baseDomain) {
      setBaseDomain(provisioningQuery.data.baseDomain);
    }
  }, [provisioningQuery.data]);

  useEffect(() => {
    const firstTenant = tenantsQuery.data?.[0]?.id ?? null;
    if (!selectedTenantId && firstTenant) {
      setSelectedTenantId(firstTenant);
    }
    if (selectedTenantId && !(tenantsQuery.data ?? []).some((tenant) => tenant.id === selectedTenantId)) {
      setSelectedTenantId(firstTenant);
    }
  }, [selectedTenantId, tenantsQuery.data]);

  const selectedTenant = useMemo(
    () => (tenantsQuery.data ?? []).find((tenant) => tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenantsQuery.data],
  );

  const draftRoute = useMemo(
    () => deriveTenantRoute(draft, {
      pathTemplate: provisioningQuery.data?.pathTemplate,
      workerNameTemplate: provisioningQuery.data?.workerNameTemplate,
    }),
    [draft, provisioningQuery.data?.pathTemplate, provisioningQuery.data?.workerNameTemplate],
  );

  const selectedJurisdiction = ARGENTINA_JURISDICTIONS.find((item) => item.type === draft.jurisdictionType);
  const canCreateTenant = Boolean(
    draft.name.trim()
      && draft.municipalityName.trim()
      && draft.countryCode.trim()
      && draft.citySlug.trim()
      && (!selectedJurisdiction?.requiresPostalCode || draft.postalCode.trim() || draft.shortCode.trim()),
  );

  const jobsQuery = useQuery({
    queryKey: queryKeys.instance.tenantJobs(selectedTenantId ?? "none"),
    queryFn: () => tenantInstancesApi.getJobs(selectedTenantId!),
    enabled: Boolean(selectedTenantId),
  });

  async function invalidateAll(tenantId?: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.instance.adminOverview }),
      queryClient.invalidateQueries({ queryKey: queryKeys.instance.tenants }),
      queryClient.invalidateQueries({ queryKey: queryKeys.instance.tenantProvisioning }),
      ...(tenantId ? [queryClient.invalidateQueries({ queryKey: queryKeys.instance.tenantJobs(tenantId) })] : []),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: () => tenantInstancesApi.create(buildCreatePayload(draft)),
    onSuccess: async (created) => {
      setDraft(EMPTY_FORM);
      setSelectedTenantId(created.id);
      await invalidateAll(created.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ tenantId, patch }: { tenantId: string; patch: UpdateTenantInstance }) =>
      tenantInstancesApi.update(tenantId, patch),
    onSuccess: async (updated) => {
      setEditingTenantId(null);
      setEditingNotes("");
      await invalidateAll(updated.id);
    },
  });

  const provisioningMutation = useMutation({
    mutationFn: () => tenantInstancesApi.updateProvisioning({ baseDomain }),
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  const redeployMutation = useMutation({
    mutationFn: (tenantId: string) => tenantInstancesApi.redeploy(tenantId),
    onSuccess: async (updated) => {
      await invalidateAll(updated.id);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (tenantId: string) => tenantInstancesApi.pause(tenantId),
    onSuccess: async (updated) => {
      await invalidateAll(updated.id);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (tenantId: string) => tenantInstancesApi.archive(tenantId),
    onSuccess: async (updated) => {
      await invalidateAll(updated.id);
    },
  });

  const tenants = tenantsQuery.data ?? [];
  const activeCount = useMemo(() => tenants.filter((tenant) => tenant.status === "active").length, [tenants]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Tenant Operations Console</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Provision city runtimes, inspect Cloudflare resource bindings, and track deployment jobs as each tenant moves from request to live route.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create tenant</CardTitle>
            <CardDescription>
              New tenants are written immediately, then provisioned asynchronously through the Cloudflare job runner.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Government name</Label>
              <Input value={draft.municipalityName} onChange={(event) => setDraft((current) => ({ ...current, municipalityName: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={draft.countryCode} onChange={(event) => setDraft((current) => ({ ...current, countryCode: event.target.value.toLowerCase() }))} />
            </div>
            <div className="space-y-2">
              <Label>Jurisdiction type</Label>
              <Select value={draft.jurisdictionType} onValueChange={(value) => setDraft((current) => ({ ...current, jurisdictionType: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARGENTINA_JURISDICTIONS.map((jurisdiction) => (
                    <SelectItem key={jurisdiction.type} value={jurisdiction.type}>
                      {jurisdiction.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Postal code</Label>
              <Input value={draft.postalCode} onChange={(event) => setDraft((current) => ({ ...current, postalCode: event.target.value.toLowerCase() }))} />
            </div>
            <div className="space-y-2">
              <Label>Place slug</Label>
              <Input value={draft.citySlug} onChange={(event) => setDraft((current) => ({ ...current, citySlug: event.target.value.toLowerCase() }))} />
            </div>
            <div className="space-y-2">
              <Label>Parent subdivision</Label>
              <Input value={draft.parentSubdivisionName} onChange={(event) => setDraft((current) => ({ ...current, parentSubdivisionName: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Parent slug</Label>
              <Input value={draft.parentSubdivisionCode} onChange={(event) => setDraft((current) => ({ ...current, parentSubdivisionCode: event.target.value.toLowerCase() }))} />
            </div>
            <div className="space-y-2">
              <Label>Route code override</Label>
              <Input placeholder="Defaults to postal code" value={draft.shortCode} onChange={(event) => setDraft((current) => ({ ...current, shortCode: event.target.value.toLowerCase() }))} />
            </div>
            <div className="space-y-2">
              <Label>Optional hostname</Label>
              <Input value={draft.hostname} onChange={(event) => setDraft((current) => ({ ...current, hostname: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Textarea placeholder="Operational notes for the rollout" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
            </div>
            <div className="md:col-span-2 grid gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm md:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="text-muted-foreground">Route preview</div>
                <div className="mt-1 break-all font-mono text-xs">https://{baseDomain}{draftRoute.pathPrefix}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDraft(EMPTY_FORM)}>
                <MapPinned className="h-4 w-4" />
                Tandil seed
              </Button>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !canCreateTenant}>
                {createMutation.isPending ? "Queueing..." : "Queue tenant provisioning"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Routing defaults</CardTitle>
            <CardDescription>
              Instance-wide defaults used for tenant URLs and runtime naming.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={baseDomain} onChange={(event) => setBaseDomain(event.target.value)} />
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <Router className="h-4 w-4" />
                Apex path routing
              </div>
              <p className="mt-2">
                Tenant URLs stay on the public apex, while the administrator surface remains isolated on <span className="font-mono text-xs">admin.ciutatis.com</span>.
              </p>
            </div>
            <Button variant="outline" onClick={() => provisioningMutation.mutate()} disabled={provisioningMutation.isPending}>
              <Save className="h-4 w-4" />
              {provisioningMutation.isPending ? "Saving..." : "Save defaults"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenants</CardTitle>
            <CardDescription>
              {tenants.length} total · {activeCount} active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tenantsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading tenants...</div> : null}
            {tenantsQuery.isError ? (
              <div className="rounded-lg border border-destructive/30 px-4 py-6 text-sm text-destructive">
                {tenantsQuery.error instanceof Error ? tenantsQuery.error.message : "Failed to load tenants"}
              </div>
            ) : null}
            {tenants.length === 0 && !tenantsQuery.isLoading ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                No tenant instances registered yet.
              </div>
            ) : null}
            {tenants.map((tenant) => {
              const isSelected = tenant.id === selectedTenantId;
              const isEditing = editingTenantId === tenant.id;
              return (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => setSelectedTenantId(tenant.id)}
                  className={[
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    isSelected ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/20",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{tenant.name}</span>
                    <Badge variant={statusVariant(tenant.status)}>{tenant.status}</Badge>
                    <Badge variant="outline">{tenant.jurisdictionType}</Badge>
                    <Badge variant="outline">bootstrap {tenant.bootstrapStatus}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span className="font-mono text-xs">{tenant.pathPrefix}</span>
                    <span className="ml-2">{tenant.dispatchScriptName ?? tenant.workerName}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {tenant.parentSubdivisionName ?? tenant.municipalityName}
                    {tenant.postalCode ? ` · CP ${tenant.postalCode}` : ""} · Latest job: {tenant.latestJob?.status ?? "none"} · {tenant.latestJob?.step ?? "queued"}
                  </div>
                  {isEditing ? (
                    <div className="mt-3 space-y-2">
                      <Textarea value={editingNotes} onChange={(event) => setEditingNotes(event.target.value)} />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={(event) => {
                          event.stopPropagation();
                          setEditingTenantId(null);
                        }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={(event) => {
                          event.stopPropagation();
                          updateMutation.mutate({ tenantId: tenant.id, patch: { notes: editingNotes } });
                        }}>
                          Save notes
                        </Button>
                      </div>
                    </div>
                  ) : tenant.notes ? (
                    <p className="mt-2 text-sm text-muted-foreground">{tenant.notes}</p>
                  ) : null}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selectedTenant?.name ?? "Tenant detail"}</CardTitle>
              <CardDescription>
                Infra summary, lifecycle actions, and latest deployment signals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedTenant ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                  Select a tenant to inspect its rollout state.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(selectedTenant.status)}>{selectedTenant.status}</Badge>
                    <Badge variant="outline">{selectedTenant.routingMode}</Badge>
                    <Badge variant="outline">{selectedTenant.jurisdictionType}</Badge>
                    <Badge variant="outline">job {selectedTenant.latestJob?.status ?? "none"}</Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="text-sm font-medium">Jurisdiction</div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {selectedTenant.parentSubdivisionName ?? selectedTenant.municipalityName}
                        {selectedTenant.postalCode ? ` · CP ${selectedTenant.postalCode}` : ""}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="text-sm font-medium">Public route</div>
                      <div className="mt-2 font-mono text-xs text-muted-foreground">{selectedTenant.tenantUrl}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="text-sm font-medium">Dispatch script</div>
                      <div className="mt-2 font-mono text-xs text-muted-foreground">{selectedTenant.dispatchScriptName ?? "Pending first deploy"}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="text-sm font-medium">D1 database</div>
                      <div className="mt-2 font-mono text-xs text-muted-foreground">{selectedTenant.tenantD1DatabaseName ?? "Pending"}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="text-sm font-medium">KV namespace</div>
                      <div className="mt-2 font-mono text-xs text-muted-foreground">{selectedTenant.tenantKvNamespaceTitle ?? "Pending"}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="text-sm font-medium">R2 bucket</div>
                      <div className="mt-2 font-mono text-xs text-muted-foreground">{selectedTenant.tenantR2BucketName ?? "Pending"}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="text-sm font-medium">Last error</div>
                      <div className="mt-2 text-sm text-muted-foreground">{selectedTenant.lastDeploymentError ?? "No deployment error recorded."}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={selectedTenant.tenantUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Open tenant
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingTenantId(selectedTenant.id);
                      setEditingNotes(selectedTenant.notes ?? "");
                    }}>
                      <Save className="h-4 w-4" />
                      Notes
                    </Button>
                    <Button size="sm" onClick={() => redeployMutation.mutate(selectedTenant.id)} disabled={redeployMutation.isPending}>
                      <RefreshCcw className="h-4 w-4" />
                      Redeploy
                    </Button>
                    {selectedTenant.status === "paused" ? (
                      <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ tenantId: selectedTenant.id, patch: { status: "active" } })} disabled={updateMutation.isPending}>
                        <PlayCircle className="h-4 w-4" />
                        Resume
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => pauseMutation.mutate(selectedTenant.id)} disabled={pauseMutation.isPending}>
                        <PauseCircle className="h-4 w-4" />
                        Pause
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => archiveMutation.mutate(selectedTenant.id)} disabled={archiveMutation.isPending}>
                      <Archive className="h-4 w-4" />
                      Archive
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provisioning log</CardTitle>
              <CardDescription>
                Job history for the currently selected tenant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {jobsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading jobs...</div> : null}
              {jobsQuery.isError ? (
                <div className="rounded-lg border border-destructive/30 px-4 py-6 text-sm text-destructive">
                  {jobsQuery.error instanceof Error ? jobsQuery.error.message : "Failed to load jobs"}
                </div>
              ) : null}
              {(jobsQuery.data ?? []).map((job) => (
                <div key={job.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={job.status === "failed" ? "destructive" : job.status === "succeeded" ? "default" : "secondary"}>
                      {job.status}
                    </Badge>
                    <Badge variant="outline">{job.kind}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">{job.step}</span>
                  </div>
                  {job.errorMessage ? (
                    <div className="mt-2 text-sm text-destructive">{job.errorMessage}</div>
                  ) : null}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Attempt {job.attempt} · {new Date(job.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {!jobsQuery.isLoading && !(jobsQuery.data ?? []).length ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  No provisioning jobs recorded for this tenant yet.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
