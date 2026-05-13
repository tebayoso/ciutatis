import { describe, expect, it } from "vitest";
import {
  ARGENTINA_TENANT_ROUTING_CONFIG,
  deriveTenantRoute,
  deriveTenantDispatcherKey,
  deriveTenantPathPrefix,
  deriveTenantWorkerName,
  parseTenantRoutePathname,
} from "@paperclipai/shared";

describe("tenant routing helpers", () => {
  it("derives normalized Argentina jurisdiction routes", () => {
    expect(deriveTenantRoute({
      countryCode: "AR",
      jurisdictionType: "municipio",
      postalCode: "7000",
      citySlug: "Tandil",
      parentSubdivisionCode: "Buenos-Aires",
      parentSubdivisionName: "Provincia de Buenos Aires",
    })).toMatchObject({
      countryCode: "ar",
      jurisdictionType: "municipio",
      postalCode: "7000",
      citySlug: "tandil",
      shortCode: "7000",
      routeSegment: "7000-tandil",
      dispatcherKey: "ar/municipio/7000-tandil",
      pathPrefix: "/ar/municipio/7000-tandil",
      workerName: "ciutatis-ar-municipio-7000-tandil",
    });
    expect(ARGENTINA_TENANT_ROUTING_CONFIG.launchTenants[0]?.pathPrefix).toBe("/ar/municipio/7000-tandil");
  });

  it("keeps legacy dispatcher helpers stable", () => {
    expect(deriveTenantDispatcherKey("AR", "Tandil", "ABC")).toBe("ar/tandil-abc");
    expect(deriveTenantPathPrefix("AR", "Tandil", "ABC")).toBe("/ar/tandil-abc");
    expect(deriveTenantWorkerName("AR", "Tandil", "ABC")).toBe("ciutatis-ar-tandil-abc");
  });

  it("parses jurisdiction-prefixed paths and strips the remainder", () => {
    expect(parseTenantRoutePathname("/ar/municipio/7000-tandil/dashboard")).toEqual({
      countryCode: "ar",
      jurisdictionType: "municipio",
      postalCode: "7000",
      citySlug: "tandil",
      shortCode: "7000",
      routeSegment: "7000-tandil",
      dispatcherKey: "ar/municipio/7000-tandil",
      pathPrefix: "/ar/municipio/7000-tandil",
      remainderPath: "/dashboard",
    });

    expect(parseTenantRoutePathname("/admin")).toBeNull();
  });

  it("parses legacy tenant-prefixed paths", () => {
    expect(parseTenantRoutePathname("/ar/tandil-abc/dashboard")).toEqual({
      countryCode: "ar",
      citySlug: "tandil",
      shortCode: "abc",
      dispatcherKey: "ar/tandil-abc",
      pathPrefix: "/ar/tandil-abc",
      remainderPath: "/dashboard",
    });
  });
});
