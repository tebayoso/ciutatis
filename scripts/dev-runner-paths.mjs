const TRACKED_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const IGNORED_SEGMENTS = new Set([
  ".DS_Store",
  ".cache",
  ".git",
  ".turbo",
  ".vite",
  "coverage",
  "dist",
  "node_modules",
  "tmp",
  "ui-dist",
]);

export function shouldTrackDevServerPath(relativePath) {
  const normalized = String(relativePath ?? "").replace(/\\/g, "/");
  if (!normalized || normalized.startsWith(".")) {
    return normalized === ".env";
  }
  if (normalized.split("/").some((segment) => IGNORED_SEGMENTS.has(segment))) {
    return false;
  }
  const lastDot = normalized.lastIndexOf(".");
  if (lastDot === -1) return false;
  return TRACKED_EXTENSIONS.has(normalized.slice(lastDot));
}
