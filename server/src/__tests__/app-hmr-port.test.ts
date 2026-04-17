import path from "node:path";
import { describe, expect, it } from "vitest";
import { isStaticUiAssetPath, resolveStaticUiCacheControl, resolveViteHmrPort } from "../app.ts";

describe("resolveViteHmrPort", () => {
  it("uses serverPort + 10000 when the result stays in range", () => {
    expect(resolveViteHmrPort(3100)).toBe(13_100);
    expect(resolveViteHmrPort(55_535)).toBe(65_535);
  });

  it("falls back below the server port when adding 10000 would overflow", () => {
    expect(resolveViteHmrPort(55_536)).toBe(45_536);
    expect(resolveViteHmrPort(63_000)).toBe(53_000);
  });

  it("never returns a privileged or invalid port", () => {
    expect(resolveViteHmrPort(65_535)).toBe(55_535);
    expect(resolveViteHmrPort(9_000)).toBe(19_000);
  });
});

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
