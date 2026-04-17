import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

function usage() {
  console.error("Usage: node scripts/prepare-admin-pages-dist.mjs <source-dist> <target-dist>");
  process.exit(1);
}

const [, , sourceArg, targetArg] = process.argv;

if (!sourceArg || !targetArg) {
  usage();
}

const sourceDir = path.resolve(sourceArg);
const targetDir = path.resolve(targetArg);

await rm(targetDir, { recursive: true, force: true });
await mkdir(path.dirname(targetDir), { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });

const redirectsPath = path.join(targetDir, "_redirects");
await writeFile(redirectsPath, "/* /index.html 200\n", "utf8");

const manifestPath = path.join(targetDir, "site.webmanifest");

try {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.start_url = "/";
  manifest.scope = "/";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
} catch {
  // Keep the deployment artifact usable even if the manifest shape changes.
}
