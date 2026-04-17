import fs from "node:fs/promises";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
  asNumber,
  asString,
  buildCiutatisEnv,
  joinPromptSections,
  redactEnvForLogs,
  renderTemplate,
} from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL } from "../index.js";
import {
  buildRunUrl,
  extractResponseText,
  extractUsage,
  firstNonEmptyLine,
  normalizeEffort,
  resolveCloudflareWorkersAiEnv,
  resolveCredentials,
  summarizeError,
} from "./shared.js";

function buildInstructionsPrefix(
  instructionsFilePath: string,
  instructionsContents: string,
): string {
  if (!instructionsContents.trim()) return "";
  return [
    instructionsContents.trim(),
    "",
    `The above agent instructions were loaded from ${instructionsFilePath}.`,
  ].join("\n");
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, config: rawConfig, context, onLog, onMeta } = ctx;
  const config = { ...rawConfig };
  const promptTemplate = asString(
    config.promptTemplate,
    "You are agent {{agent.id}} ({{agent.name}}). Continue your Ciutatis work and be explicit about blockers or next steps.",
  );
  const model = asString(config.model, DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL).trim();
  const timeoutSec = asNumber(config.timeoutSec, 120);
  const maxOutputTokens = Math.max(64, asNumber(config.maxOutputTokens, 4096));
  const env = {
    ...buildCiutatisEnv(agent),
    ...resolveCloudflareWorkersAiEnv(config.env),
  };
  const runtimeEnv = Object.fromEntries(
    Object.entries({ ...process.env, ...env }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const credentials = resolveCredentials(config, runtimeEnv);
  if (!credentials.accountId || !credentials.apiToken) {
    const missing = [
      credentials.accountId ? null : "CLOUDFLARE_ACCOUNT_ID",
      credentials.apiToken ? null : "CLOUDFLARE_API_TOKEN",
    ]
      .filter(Boolean)
      .join(", ");
    await onLog(
      "stderr",
      JSON.stringify({
        type: "system",
        subtype: "error",
        error: `Missing Cloudflare Workers AI credentials: ${missing}`,
      }) + "\n",
    );
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorCode: "cloudflare_workers_ai_credentials_missing",
      errorMessage: `Missing Cloudflare Workers AI credentials: ${missing}`,
    };
  }

  const instructionsFilePath = asString(config.instructionsFilePath, "").trim();
  let instructionsPrefix = "";
  if (instructionsFilePath) {
    try {
      const instructionsContents = await fs.readFile(instructionsFilePath, "utf8");
      instructionsPrefix = buildInstructionsPrefix(instructionsFilePath, instructionsContents);
      await onLog(
        "stdout",
        JSON.stringify({
          type: "system",
          subtype: "info",
          message: `Loaded agent instructions from ${instructionsFilePath}`,
        }) + "\n",
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await onLog(
        "stderr",
        JSON.stringify({
          type: "system",
          subtype: "warn",
          error: `Could not read instructions file "${instructionsFilePath}": ${reason}`,
        }) + "\n",
      );
    }
  }

  const templateData = {
    agentId: agent.id,
    companyId: agent.companyId,
    runId,
    company: { id: agent.companyId },
    agent,
    run: { id: runId, source: "on_demand" },
    context,
  };
  const renderedPrompt = renderTemplate(promptTemplate, templateData);
  const sessionHandoffNote = asString(context.paperclipSessionHandoffMarkdown, "").trim();
  const systemPrompt = joinPromptSections([
    "You are a Ciutatis agent backed by Cloudflare Workers AI.",
    "This runtime provides hosted model inference only. Do not claim to have run shell commands, edited files, or accessed tools unless the prompt explicitly includes such outputs.",
    instructionsPrefix,
  ]);
  const userPrompt = joinPromptSections([sessionHandoffNote, renderedPrompt]);
  const effort = normalizeEffort(config.effort ?? config.reasoningEffort);

  if (onMeta) {
    await onMeta({
      adapterType: "cloudflare_workers_ai",
      command: "cloudflare-workers-ai",
      commandNotes: ["Invokes Cloudflare Workers AI via the direct ai/run REST API."],
      commandArgs: [
        `model=${model}`,
        ...(effort ? [`reasoning=${effort}`] : []),
        `max_tokens=${maxOutputTokens}`,
        `<prompt ${userPrompt.length} chars>`,
      ],
      env: redactEnvForLogs({
        CLOUDFLARE_ACCOUNT_ID: credentials.accountId,
        CLOUDFLARE_API_TOKEN: credentials.apiToken,
      }),
      prompt: userPrompt,
      promptMetrics: {
        promptChars: userPrompt.length,
        instructionsChars: systemPrompt.length,
      },
    });
  }

  const body: Record<string, unknown> = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: maxOutputTokens,
  };
  if (effort) {
    body.reasoning = { effort };
  }

  await onLog(
    "stdout",
    JSON.stringify({ type: "system", subtype: "init", model }) + "\n",
  );

  const controller = new AbortController();
  const timeout = timeoutSec > 0 ? setTimeout(() => controller.abort(), timeoutSec * 1000) : null;

  try {
    const response = await fetch(buildRunUrl(credentials.accountId, model), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${credentials.apiToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      const reason = summarizeError(payload) ?? `Cloudflare Workers AI returned status ${response.status}`;
      await onLog(
        "stderr",
        JSON.stringify({ type: "system", subtype: "error", error: reason }) + "\n",
      );
      return {
        exitCode: response.status,
        signal: null,
        timedOut: false,
        errorCode: "cloudflare_workers_ai_request_failed",
        errorMessage: reason,
        provider: "cloudflare",
        biller: "cloudflare",
        model,
        billingType: "metered_api",
        resultJson: payload,
      };
    }

    const outputText = extractResponseText(payload);
    const usage = extractUsage(payload);
    if (outputText) {
      await onLog(
        "stdout",
        JSON.stringify({
          type: "assistant",
          message: {
            content: [{ type: "output_text", text: outputText }],
          },
        }) + "\n",
      );
    }
    await onLog(
      "stdout",
      JSON.stringify({
        type: "result",
        subtype: "success",
        usage: {
          input_tokens: usage?.inputTokens ?? 0,
          output_tokens: usage?.outputTokens ?? 0,
          cached_input_tokens: usage?.cachedInputTokens ?? 0,
        },
      }) + "\n",
    );

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      usage,
      provider: "cloudflare",
      biller: "cloudflare",
      model,
      billingType: "metered_api",
      summary: firstNonEmptyLine(outputText),
      resultJson: payload,
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const message = isAbort
      ? `Cloudflare Workers AI request timed out after ${timeoutSec}s`
      : error instanceof Error
        ? error.message
        : String(error);
    await onLog(
      "stderr",
      JSON.stringify({ type: "system", subtype: "error", error: message }) + "\n",
    );
    return {
      exitCode: null,
      signal: null,
      timedOut: isAbort,
      errorCode: isAbort ? "cloudflare_workers_ai_timeout" : "cloudflare_workers_ai_request_error",
      errorMessage: message,
      provider: "cloudflare",
      biller: "cloudflare",
      model,
      billingType: "metered_api",
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
