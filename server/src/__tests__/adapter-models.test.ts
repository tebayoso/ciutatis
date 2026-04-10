import { beforeEach, describe, expect, it, vi } from "vitest";
import { models as claudeModels } from "@ciutatis/adapter-claude-local";
import { models as cloudflareWorkersAiModels } from "@ciutatis/adapter-cloudflare-workers-ai";
import { models as codexModels } from "@ciutatis/adapter-codex-local";
import { models as cursorModels } from "@ciutatis/adapter-cursor-local";
import { models as geminiModels } from "@ciutatis/adapter-gemini-local";
import { findServerAdapter, listAdapterModels, listServerAdapters } from "../adapters/index.js";

describe("adapter model listing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty list for unknown adapters", async () => {
    const models = await listAdapterModels("unknown_adapter");
    expect(models).toEqual([]);
  });

  it("returns Workers AI models for the cloudflare_workers_ai adapter", async () => {
    const models = await listAdapterModels("cloudflare_workers_ai");
    expect(models).toEqual(cloudflareWorkersAiModels);
    expect(models.length).toBeGreaterThan(0);
  });

  it("returns gemini models for the gemini_local adapter", async () => {
    const models = await listAdapterModels("gemini_local");
    expect(models).toEqual(geminiModels);
    expect(models.length).toBeGreaterThan(0);
  });

  it("returns Claude models for the claude_local adapter", async () => {
    const models = await listAdapterModels("claude_local");
    expect(models).toEqual(claudeModels);
    expect(models.length).toBeGreaterThan(0);
  });

  it("returns Codex models for the codex_local adapter", async () => {
    const models = await listAdapterModels("codex_local");
    expect(models).toEqual(codexModels);
    expect(models.length).toBeGreaterThan(0);
  });

  it("returns Cursor models for the cursor adapter", async () => {
    const models = await listAdapterModels("cursor");
    expect(models).toEqual(cursorModels);
    expect(models.length).toBeGreaterThan(0);
  });

  it("keeps dynamic local adapters registered and discoverable", async () => {
    const adapter = findServerAdapter("opencode_local");
    expect(adapter).not.toBeNull();
    vi.spyOn(adapter!, "listModels").mockResolvedValue([
      { id: "openrouter/qwen/qwen3-coder", label: "openrouter/qwen/qwen3-coder" },
    ]);

    const models = await listAdapterModels("opencode_local");
    expect(models).toEqual([
      { id: "openrouter/qwen/qwen3-coder", label: "openrouter/qwen/qwen3-coder" },
    ]);
    expect(listServerAdapters().some((adapter) => adapter.type === "opencode_local")).toBe(true);
  });

  it("keeps the OpenClaw gateway adapter registered", () => {
    expect(listServerAdapters().some((adapter) => adapter.type === "openclaw_gateway")).toBe(true);
  });
});
