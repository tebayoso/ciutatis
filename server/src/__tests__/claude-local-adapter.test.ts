import { describe, expect, it } from "vitest";
import { isClaudeMaxTurnsResult } from "@paperclipai/adapter-claude-local/server";

describe("claude_local max-turn detection", () => {
  it("detects max-turn exhaustion by subtype", () => {
    expect(
      isClaudeMaxTurnsResult({
        subtype: "error_max_turns",
        result: "Reached max turns",
      }),
    ).toBe(true);
  });

  it("detects max-turn exhaustion by stop_reason", () => {
    expect(
      isClaudeMaxTurnsResult({
        stop_reason: "max_turns",
      }),
    ).toBe(true);
  });

  it("checks every structured stop field for max-turn exhaustion", () => {
    expect(
      isClaudeMaxTurnsResult({
        stop_reason: "end_turn",
        stopReason: "max_turns_exhausted",
      }),
    ).toBe(true);
  });

  it("returns false for non-max-turn results", () => {
    expect(
      isClaudeMaxTurnsResult({
        subtype: "success",
        stop_reason: "end_turn",
      }),
    ).toBe(false);
  });

  it("does not detect max-turn exhaustion from unstructured result text", () => {
    expect(
      isClaudeMaxTurnsResult({
        subtype: "error",
        result: "Tool output said: Maximum turns reached.",
      }),
    ).toBe(false);
  });
});
