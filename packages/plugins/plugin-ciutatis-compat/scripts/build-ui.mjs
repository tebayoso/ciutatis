import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");

await esbuild.build({
  entryPoints: [path.join(packageRoot, "src/ui/index.ts")],
  outdir: path.join(packageRoot, "dist/ui"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  jsx: "automatic",
  external: ["react", "react-dom", "react/jsx-runtime", "@paperclipai/plugin-sdk", "@paperclipai/plugin-sdk/ui"],
  logLevel: "info",
});
