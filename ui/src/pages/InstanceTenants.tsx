import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TenantInstance, UpdateTenantInstance } from "@ciutatis/shared";
import { Building2, ExternalLink, Globe2, Plus, Router, Save } from "lucide-react";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { tenantInstancesApi } from "@/api/tenantInstances";
import { queryKeys } from "@/lib/queryKeys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type DraftForm = {
  name: string;
  municipalityName: string;
  countryCode: string;
  citySlug: string;
  shortCode: string;
  routingMode: "path" | "subdomain" | "custom_domain";
  hostname: string;
  notes: string;
};

const EMPTY_FORM: DraftForm = {
  name: "",
  municipalityName: "",
  countryCode: "ar",
  citySlug: "",
  shortCode: "",
  routingMode: "path",
  hostname: "",
  notes: "",
};

function statusVariant(status: TenantInstance["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "default";
  if (status === "error") return "destructive";
  if (status === "draft" || status === "archived") return "outline";
  return "secondary";
}

function nextStatus(status: TenantInstance["status"]): TenantInstance["status"] {
  if (status === "provisioning") return "active";
  if (status === "active") return "paused";
  if (status === "paused") return "active";
  if (status === "draft") return "provisioning";
  return status;
}

export function InstanceTenants() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftForm>(EMPTY_FORM);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [baseDomain, setBaseDomain] = useState("ciutatis.com");

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

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.instance.tenants }),
      queryClient.invalidateQueries({ queryKey: queryKeys.instance.tenantProvisioning }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: () => tenantInstancesApi.create(draft),
    onSuccess: async () => {
      setDraft(EMPTY_FORM);
      await invalidateAll();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ tenantId, patch }: { tenantId: string; patch: UpdateTenantInstance }) =>
      tenantInstancesApi.update(tenantId, patch),
    onSuccess: async () => {
      setEditingTenantId(null);
      setEditingNotes("");
      await invalidateAll();
    },
  });

  const provisioningMutation = useMutation({
    mutationFn: () => tenantInstancesApi.updateProvisioning({ baseDomain }),
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  const tenants = tenantsQuery.data ?? [];
  const activeCount = useMemo(() => tenants.filter((tenant) => tenant.status === "active").length, [tenants]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Tenant Instances</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage the civic instances your company shell provisions. Each tenant maps to an isolated Ciutatis deployment boundary.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provision a new city instance</CardTitle>
            <CardDescription>
              Start with path-based civic routes like <span className="font-mono text-xs">/{'{countryCode}'}/{'{citySlug}'}-{'{shortCode}'}</span> and evolve later.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Display name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            <Input placeholder="Municipality" value={draft.municipalityName} onChange={(event) => setDraft((current) => ({ ...current, municipalityName: event.target.value }))} />
            <Input placeholder="Country code" value={draft.countryCode} onChange={(event) => setDraft((current) => ({ ...current, countryCode: event.target.value }))} />
            <Input placeholder="City slug" value={draft.citySlug} onChange={(event) => setDraft((current) => ({ ...current, citySlug: event.target.value.toLowerCase() }))} />
            <Input placeholder="Short code" value={draft.shortCode} onChange={(event) => setDraft((current) => ({ ...current, shortCode: event.target.value }))} />
            <Input placeholder="Optional hostname" value={draft.hostname} onChange={(event) => setDraft((current) => ({ ...current, hostname: event.target.value }))} />
            <div className="md:col-span-2">
              <Textarea placeholder="Operational notes for this tenant" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
              <span>Next route preview</span>
              <span className="font-mono text-xs text-foreground">https://{baseDomain}/{draft.countryCode || "ar"}/{draft.citySlug || "city"}-{(draft.shortCode || "abc").toLowerCase()}</span>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !draft.name || !draft.municipalityName || !draft.citySlug || !draft.shortCode}>
                <Plus className="h-4 w-4" />
                {createMutation.isPending ? "Provisioning…" : "Create tenant"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provisioning defaults</CardTitle>
            <CardDescription>
              Instance-level settings used by the admin shell when creating new city deployments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={baseDomain} onChange={(event) => setBaseDomain(event.target.value)} />
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground"><Router className="h-4 w-4" /> Path-based routing first</div>
              <p className="mt-1">This foundation supports civic paths now and leaves room for subdomains or custom domains later.</p>
            </div>
            <Button variant="outline" onClick={() => provisioningMutation.mutate()} disabled={provisioningMutation.isPending}>
              <Save className="h-4 w-4" />
              {provisioningMutation.isPending ? "Saving…" : "Save defaults"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered tenants</CardTitle>
          <CardDescription>
            {tenants.length} total · {activeCount} active
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tenantsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading tenants…</div> : null}
          {!tenantsQuery.isLoading && tenants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              No tenant instances registered yet.
            </div>
          ) : null}
          {tenants.map((tenant) => {
            const isEditing = editingTenantId === tenant.id;
            return (
              <div key={tenant.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{tenant.name}</span>
                      <Badge variant={statusVariant(tenant.status)}>{tenant.status}</Badge>
                      <Badge variant="outline">{tenant.routingMode}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tenant.municipalityName} · <span className="font-mono text-xs">{tenant.pathPrefix}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Worker <span className="font-mono">{tenant.workerName}</span>
                    </div>
                    {isEditing ? (
                      <Textarea value={editingNotes} onChange={(event) => setEditingNotes(event.target.value)} />
                    ) : tenant.notes ? (
                      <p className="text-sm text-muted-foreground">{tenant.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={tenant.tenantUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingTenantId(tenant.id);
                      setEditingNotes(tenant.notes ?? "");
                    }}>
                      <Globe2 className="h-4 w-4" />
                      Notes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({ tenantId: tenant.id, patch: { status: nextStatus(tenant.status) } })}
                      disabled={updateMutation.isPending}
                    >
                      Advance status
                    </Button>
                  </div>
                </div>
                {isEditing ? (
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingTenantId(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => updateMutation.mutate({ tenantId: tenant.id, patch: { notes: editingNotes } })} disabled={updateMutation.isPending}>
                      Save notes
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
