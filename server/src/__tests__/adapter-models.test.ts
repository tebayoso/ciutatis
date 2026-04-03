import { beforeEach, describe, expect, it, vi } from "vitest";
import { models as geminiModels } from "@ciutatis/adapter-gemini-local";
import { listAdapterModels } from "../adapters/index.js";

describe("adapter model listing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty list for unknown adapters", async () => {
    const models = await listAdapterModels("unknown_adapter");
    expect(models).toEqual([]);
  });

  it("returns gemini models for the gemini_local adapter", async () => {
    const models = await listAdapterModels("gemini_local");
    expect(models).toEqual(geminiModels);
    expect(models.length).toBeGreaterThan(0);
  });

  // Ciutatis Gemini-only policy: codex_local, cursor, claude_local, and opencode_local
  // adapters are not registered in the server adapter registry.
  // These tests verify they correctly return empty model lists.

  it("returns empty list for codex_local (not registered under Gemini-only policy)", async () => {
    const models = await listAdapterModels("codex_local");
    expect(models).toEqual([]);
  });

  it("returns empty list for cursor (not registered under Gemini-only policy)", async () => {
    const models = await listAdapterModels("cursor");
    expect(models).toEqual([]);
  });

  it("returns empty list for opencode_local (not registered under Gemini-only policy)", async () => {
    const models = await listAdapterModels("opencode_local");
    expect(models).toEqual([]);
  });
});
