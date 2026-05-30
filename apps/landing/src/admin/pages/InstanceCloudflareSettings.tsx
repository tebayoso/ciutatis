import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatchCloudflareProvisioningSettings } from "@paperclipai/shared";
import { CheckCircle2, CloudCog, ShieldAlert, Sparkles } from "lucide-react";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { tenantInstancesApi } from "@/api/tenantInstances";
import { queryKeys } from "@/lib/queryKeys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type CloudflareFormState = PatchCloudflareProvisioningSettings;

function emptyState(): CloudflareFormState {
  return {
    enabled: false,
    accountId: "",
    zoneId: "",
    zoneName: "ciutatis.com",
    publicHostname: "ciutatis.com",
    adminHostname: "admin.ciutatis.com",
    landingHostname: "ciutatis.com",
    dispatchNamespace: "ciutatis-tenants",
    routingKvNamespaceId: "",
    routingKvNamespaceTitle: "",
    tenantWorkerScriptPrefix: "ciutatis-tenant",
    tenantDatabasePrefix: "ciutatis-tenant-db",
    tenantBucketPrefix: "ciutatis-tenant-r2",
    tenantKvPrefix: "ciutatis-tenant-kv",
  };
}

export function InstanceCloudflareSettings() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CloudflareFormState>(emptyState());

  useEffect(() => {
    setBreadcrumbs([
      { label: "Instance Settings" },
      { label: "Cloudflare" },
    ]);
  }, [setBreadcrumbs]);

  const cloudflareQuery = useQuery({
    queryKey: queryKeys.instance.cloudflareProvisioning,
    queryFn: () => tenantInstancesApi.getCloudflare(),
  });

  useEffect(() => {
    if (!cloudflareQuery.data) return;
    setForm({
      enabled: cloudflareQuery.data.enabled,
      accountId: cloudflareQuery.data.accountId,
      zoneId: cloudflareQuery.data.zoneId,
      zoneName: cloudflareQuery.data.zoneName,
      publicHostname: cloudflareQuery.data.publicHostname,
      adminHostname: cloudflareQuery.data.adminHostname,
      landingHostname: cloudflareQuery.data.landingHostname,
      dispatchNamespace: cloudflareQuery.data.dispatchNamespace,
      routingKvNamespaceId: cloudflareQuery.data.routingKvNamespaceId,
      routingKvNamespaceTitle: cloudflareQuery.data.routingKvNamespaceTitle ?? "",
      tenantWorkerScriptPrefix: cloudflareQuery.data.tenantWorkerScriptPrefix,
      tenantDatabasePrefix: cloudflareQuery.data.tenantDatabasePrefix,
      tenantBucketPrefix: cloudflareQuery.data.tenantBucketPrefix,
      tenantKvPrefix: cloudflareQuery.data.tenantKvPrefix,
    });
  }, [cloudflareQuery.data]);

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.instance.cloudflareProvisioning }),
      queryClient.invalidateQueries({ queryKey: queryKeys.instance.adminOverview }),
    ]);
  }

  const saveMutation = useMutation({
    mutationFn: () => tenantInstancesApi.updateCloudflare(form),
    onSuccess: invalidateAll,
  });

  const validateMutation = useMutation({
    mutationFn: () => tenantInstancesApi.validateCloudflare(),
    onSuccess: invalidateAll,
  });

  const current = cloudflareQuery.data;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CloudCog className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Cloudflare Provisioning</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure the control-plane connection that deploys tenant runtimes, writes apex routing entries, and keeps the administrator shell anchored at <span className="font-mono text-xs">admin.ciutatis.com</span>.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection settings</CardTitle>
            <CardDescription>
              Only non-secret Cloudflare configuration is stored here. The API token remains external and is exposed only as a redacted status bit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
              <Checkbox
                checked={form.enabled}
                onCheckedChange={(checked) =>
                  setForm((currentForm) => ({ ...currentForm, enabled: checked === true }))
                }
              />
              <div>
                <div className="text-sm font-medium">Enable Cloudflare-driven tenant provisioning</div>
                <div className="text-sm text-muted-foreground">
                  When disabled, local/mock provisioning still advances jobs without touching Cloudflare.
                </div>
              </div>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Account ID" value={form.accountId ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, accountId: event.target.value }))} />
              <Input placeholder="Zone ID" value={form.zoneId ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, zoneId: event.target.value }))} />
              <Input placeholder="Zone name" value={form.zoneName ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, zoneName: event.target.value }))} />
              <Input placeholder="Dispatch namespace" value={form.dispatchNamespace ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, dispatchNamespace: event.target.value }))} />
              <Input placeholder="Public hostname" value={form.publicHostname ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, publicHostname: event.target.value }))} />
              <Input placeholder="Admin hostname" value={form.adminHostname ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, adminHostname: event.target.value }))} />
              <Input placeholder="Landing hostname" value={form.landingHostname ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, landingHostname: event.target.value }))} />
              <Input placeholder="Routing KV namespace ID" value={form.routingKvNamespaceId ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, routingKvNamespaceId: event.target.value }))} />
              <Input placeholder="Routing KV title" value={form.routingKvNamespaceTitle ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, routingKvNamespaceTitle: event.target.value }))} />
              <Input placeholder="Tenant script prefix" value={form.tenantWorkerScriptPrefix ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, tenantWorkerScriptPrefix: event.target.value }))} />
              <Input placeholder="Tenant D1 prefix" value={form.tenantDatabasePrefix ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, tenantDatabasePrefix: event.target.value }))} />
              <Input placeholder="Tenant R2 prefix" value={form.tenantBucketPrefix ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, tenantBucketPrefix: event.target.value }))} />
              <Input placeholder="Tenant KV prefix" value={form.tenantKvPrefix ?? ""} onChange={(event) => setForm((currentForm) => ({ ...currentForm, tenantKvPrefix: event.target.value }))} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save settings"}
              </Button>
              <Button variant="outline" onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}>
                {validateMutation.isPending ? "Validating..." : "Validate connection"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connection status</CardTitle>
              <CardDescription>
                Redacted health state for the Cloudflare management link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={current?.enabled ? "default" : "outline"}>{current?.enabled ? "Enabled" : "Disabled"}</Badge>
                <Badge variant={current?.apiTokenConfigured ? "default" : "destructive"}>
                  {current?.apiTokenConfigured ? "Token configured" : "Token missing"}
                </Badge>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="font-medium">Admin host</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{current?.adminHostname ?? "admin.ciutatis.com"}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="font-medium">Last validation</div>
                <div className="mt-1 text-muted-foreground">
                  {current?.lastValidatedAt ? new Date(current.lastValidatedAt).toLocaleString() : "Not validated yet"}
                </div>
                {current?.lastValidationError ? (
                  <div className="mt-2 flex gap-2 text-destructive">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{current.lastValidationError}</span>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2 text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>No validation errors recorded.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provisioning targets</CardTitle>
              <CardDescription>
                Naming conventions for per-tenant runtimes and isolated data-plane resources.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4" />
                  Dispatch namespace
                </div>
                <div className="mt-2 font-mono text-xs">{form.dispatchNamespace || "ciutatis-tenants"}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs">
                Script: {form.tenantWorkerScriptPrefix || "ciutatis-tenant"}-{"{city}"}
                <br />
                D1: {form.tenantDatabasePrefix || "ciutatis-tenant-db"}-{"{city}"}
                <br />
                R2: {form.tenantBucketPrefix || "ciutatis-tenant-r2"}-{"{city}"}
                <br />
                KV: {form.tenantKvPrefix || "ciutatis-tenant-kv"}-{"{city}"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
