import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import "./check.mjs";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, "src"), dist, { recursive: true });

console.log(`superparser portal built at ${dist}`);
