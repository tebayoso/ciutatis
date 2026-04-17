import { describe, expect, it } from "vitest";
import {
  deriveTenantDispatcherKey,
  deriveTenantPathPrefix,
  deriveTenantWorkerName,
  parseTenantRoutePathname,
} from "@paperclipai/shared";

describe("tenant routing helpers", () => {
  it("derives normalized dispatcher keys and prefixes", () => {
    expect(deriveTenantDispatcherKey("AR", "Tandil", "ABC")).toBe("ar/tandil-abc");
    expect(deriveTenantPathPrefix("AR", "Tandil", "ABC")).toBe("/ar/tandil-abc");
    expect(deriveTenantWorkerName("AR", "Tandil", "ABC")).toBe("ciutatis-ar-tandil-abc");
  });

  it("parses tenant-prefixed paths and strips the remainder", () => {
    expect(parseTenantRoutePathname("/ar/tandil-abc/dashboard")).toEqual({
      countryCode: "ar",
      citySlug: "tandil",
      shortCode: "abc",
      dispatcherKey: "ar/tandil-abc",
      pathPrefix: "/ar/tandil-abc",
      remainderPath: "/dashboard",
    });

    expect(parseTenantRoutePathname("/admin")).toBeNull();
  });
});
