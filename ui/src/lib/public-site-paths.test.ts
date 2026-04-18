import { describe, expect, it } from "vitest";
import { isAdminHostname, isPublicSitePath } from "./public-site-paths";

describe("isAdminHostname", () => {
  it("recognizes the admin control-plane hostname", () => {
    expect(isAdminHostname("admin.ciutatis.com")).toBe(true);
  });

  it("does not treat the public apex as admin", () => {
    expect(isAdminHostname("ciutatis.com")).toBe(false);
  });
});

describe("isPublicSitePath", () => {
  it("keeps marketing routes public on the public host", () => {
    expect(isPublicSitePath("/en", "ciutatis.com")).toBe(true);
    expect(isPublicSitePath("/es/plataforma", "ciutatis.com")).toBe(true);
    expect(isPublicSitePath("/portal", "ciutatis.com")).toBe(true);
    expect(isPublicSitePath("/portal/requests/pap-12", "ciutatis.com")).toBe(true);
  });

  it("disables marketing routing on the admin host", () => {
    expect(isPublicSitePath("/", "admin.ciutatis.com")).toBe(false);
    expect(isPublicSitePath("/en", "admin.ciutatis.com")).toBe(false);
    expect(isPublicSitePath("/es", "admin.ciutatis.com")).toBe(false);
  });
});
