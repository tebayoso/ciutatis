/**
 * Ciutatis fork compatibility shims.
 *
 * Hosted as installable documentation/runtime surface by
 * `@ciutatis/plugin-ciutatis-compat`. Keep this module thin: prefer real
 * upstream modules restored for plugin extensions (routines types, company
 * skills types, plugin validators) over sprawling inline stubs.
 */
import { z } from "zod";

export const telemetryEventSchema = z.object({}).passthrough();

export function trackAgentFirstHeartbeat(_tc: {
  agentRole: string | null;
  agentId: string;
}): void {
  // No-op — telemetry removed from Ciutatis runtime.
}

export function extractSkillMentionIds(_source: string): string[] {
  return [];
}

export function hasNonAsciiContent(content: string): boolean {
  return /[^\u0000-\u007f]/.test(content);
}

/**
 * Features intentionally disabled or deferred in the Ciutatis fork.
 * The compat plugin surfaces this catalog to operators.
 */
export const CIUTATIS_DISABLED_UPSTREAM_FEATURES = [
  {
    id: "routines-runtime",
    title: "Routines runtime",
    reason: "Civic control-plane V1 scopes to issues/agents; routine types kept for plugin manifest compatibility only.",
  },
  {
    id: "feedback-telemetry",
    title: "Feedback / telemetry",
    reason: "Product telemetry and feedback export pipelines are disabled in Ciutatis. Host stubs remain in fork-compat.",
  },
  {
    id: "board-auth-cli",
    title: "Board-auth CLI surfaces",
    reason: "Ciutatis uses Better Auth board sessions; legacy board-auth CLI helpers were removed.",
  },
  {
    id: "company-skills-library",
    title: "Company skills library runtime",
    reason: "Skills catalog types remain for plugin declarations; first-class skills library routes stay deferred.",
  },
] as const;

/**
 * SDK naming aliases applied so upstream Paperclip plugins keep compiling.
 * Implemented in `@paperclipai/plugin-sdk` (`PaperclipPlugin` → `CiutatisPlugin`).
 */
export const CIUTATIS_SDK_ALIASES = [
  {
    upstream: "PaperclipPlugin",
    ciutatis: "CiutatisPlugin",
    location: "packages/plugins/sdk/src/define-plugin.ts",
  },
  {
    upstream: "PaperclipPluginManifestV1",
    ciutatis: "CiutatisPluginManifestV1",
    location: "packages/shared/src/fork-compat/upstream-stubs.ts",
  },
] as const;

export type CiutatisDisabledUpstreamFeature =
  (typeof CIUTATIS_DISABLED_UPSTREAM_FEATURES)[number];

export type { PaperclipPluginManifestV1 as CiutatisPluginManifestV1 } from "../types/plugin.js";
export type {
  PluginApiRouteAuthMode,
  PluginApiRouteCheckoutPolicy,
  PluginApiRouteMethod,
} from "../constants.js";
