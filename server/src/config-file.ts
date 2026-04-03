import fs from "node:fs";
import { paperclipConfigSchema, type CiutatisConfig } from "@ciutatis/shared";
import { resolveCiutatisConfigPath } from "./paths.js";

export function readConfigFile(): CiutatisConfig | null {
  const configPath = resolveCiutatisConfigPath();

  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return paperclipConfigSchema.parse(raw);
  } catch {
    return null;
  }
}
