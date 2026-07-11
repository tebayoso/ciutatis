/**
 * Re-exports Ciutatis fork-compat shims from `@paperclipai/shared`.
 * Plugin authors and host tooling should import from here when they need the
 * curated list of intentional Paperclip deviations.
 */
export {
  CIUTATIS_DISABLED_UPSTREAM_FEATURES,
  CIUTATIS_SDK_ALIASES,
  telemetryEventSchema,
  trackAgentFirstHeartbeat,
  extractSkillMentionIds,
  hasNonAsciiContent,
  type CiutatisDisabledUpstreamFeature,
} from "@paperclipai/shared";

export const CIUTATIS_CIVIC_ALIASES = [
  { upstream: "company", ciutatis: "institution" },
  { upstream: "issue", ciutatis: "request" },
  { upstream: "goal", ciutatis: "objective" },
] as const;
