import path from "node:path";
import { describe, expect, it } from "vitest";
import { isStaticUiAssetPath, resolveStaticUiCacheControl } from "../app.ts";

describe("resolveStaticUiCacheControl", () => {
  const uiRoot = path.resolve("/tmp/ciutatis-ui");
  const indexHtmlPath = path.join(uiRoot, "index.html");

  it("marks index.html as no-cache", () => {
    expect(resolveStaticUiCacheControl(indexHtmlPath, indexHtmlPath)).toBe("no-cache");
  });

  it("marks hashed assets as immutable", () => {
    expect(
      resolveStaticUiCacheControl(path.join(uiRoot, "assets", "index-abc123.js"), indexHtmlPath),
    ).toBe("public, max-age=31536000, immutable");
  });

  it("uses a shorter cache window for non-asset static files", () => {
    expect(
      resolveStaticUiCacheControl(path.join(uiRoot, "site.webmanifest"), indexHtmlPath),
    ).toBe("public, max-age=3600");
  });
});

describe("isStaticUiAssetPath", () => {
  it("matches top-level asset paths", () => {
    expect(isStaticUiAssetPath("/assets")).toBe(true);
    expect(isStaticUiAssetPath("/assets/index-abc123.js")).toBe(true);
  });

  it("ignores non-asset routes", () => {
    expect(isStaticUiAssetPath("/api/assets/123/content")).toBe(false);
    expect(isStaticUiAssetPath("/en")).toBe(false);
  });
});
