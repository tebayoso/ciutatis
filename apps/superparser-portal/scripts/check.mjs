import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const required = [
  "src/index.html",
  "src/styles.css",
  "src/app.js",
];

for (const file of required) {
  const path = join(root, file);
  const stat = statSync(path);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`Missing portal file: ${file}`);
  }
}

const html = readFileSync(join(root, "src/index.html"), "utf8");
const js = readFileSync(join(root, "src/app.js"), "utf8");

for (const id of ["upload-form", "drive-form", "search-form", "document-detail", "job-list"]) {
  if (!html.includes(`id="${id}"`)) {
    throw new Error(`Missing required UI hook: ${id}`);
  }
}

for (const endpoint of ["/v1/ingestions", "/v1/search", "/v1/documents"]) {
  if (!js.includes(endpoint)) {
    throw new Error(`Missing API endpoint usage: ${endpoint}`);
  }
}

console.log("superparser portal checks passed");
