interface Env {
  STATUS_CACHE: KVNamespace;
  PUBLIC_API: Fetcher;
  ADMIN_API: Fetcher;
  CIUTATIS_PUBLIC_ORIGIN?: string;
  CIUTATIS_ADMIN_ORIGIN?: string;
  STATUS_PAGE_TITLE?: string;
  STATUS_PAGE_TAGLINE?: string;
}

type MonitorId = "public-site" | "public-api" | "admin-shell" | "admin-api";

type OverallStatus = "operational" | "degraded";

interface MonitorDefinition {
  id: MonitorId;
  name: string;
  url: string;
  category: "public" | "admin";
  kind: "redirect" | "health" | "html";
  serviceBinding?: "PUBLIC_API" | "ADMIN_API";
}

interface MonitorResult {
  id: MonitorId;
  name: string;
  url: string;
  category: "public" | "admin";
  ok: boolean;
  status: "operational" | "degraded";
  summary: string;
  details: string;
  checkedAt: string;
  latencyMs: number | null;
  statusCode: number | null;
}

interface HistoryPoint {
  checkedAt: string;
  ok: boolean;
  latencyMs: number | null;
}

interface StatusSnapshot {
  checkedAt: string;
  overall: OverallStatus;
  monitors: MonitorResult[];
}

interface StatusPayload {
  snapshot: StatusSnapshot;
  history: Record<MonitorId, HistoryPoint[]>;
}

const SNAPSHOT_KEY = "status:snapshot:v1";
const HISTORY_PREFIX = "status:history:v1:";
const HISTORY_LIMIT = 288;
const STALE_AFTER_MS = 10 * 60 * 1000;

function normalizeOrigin(value: string | undefined, fallback: string): string {
  return (value ?? fallback).trim().replace(/\/+$/, "");
}

function monitorDefinitions(env: Env): MonitorDefinition[] {
  const publicOrigin = normalizeOrigin(env.CIUTATIS_PUBLIC_ORIGIN, "https://ciutatis.com");
  const adminOrigin = normalizeOrigin(env.CIUTATIS_ADMIN_ORIGIN, "https://admin.ciutatis.com");

  return [
    {
      id: "public-site",
      name: "Public site",
      url: `${publicOrigin}/`,
      category: "public",
      kind: "redirect",
    },
    {
      id: "public-api",
      name: "Public API",
      url: `${publicOrigin}/api/health`,
      category: "public",
      kind: "health",
      serviceBinding: "PUBLIC_API",
    },
    {
      id: "admin-shell",
      name: "Admin shell",
      url: `${adminOrigin}/`,
      category: "admin",
      kind: "html",
    },
    {
      id: "admin-api",
      name: "Admin API",
      url: `${adminOrigin}/api/health`,
      category: "admin",
      kind: "health",
      serviceBinding: "ADMIN_API",
    },
  ];
}

async function fetchWithTiming(url: string, init?: RequestInit) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    ...init,
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
      ...(init?.headers ?? {}),
    },
  });
  return {
    response,
    latencyMs: Date.now() - startedAt,
  };
}

async function fetchThroughService(binding: Fetcher, url: string, init?: RequestInit) {
  const startedAt = Date.now();
  const response = await binding.fetch(
    new Request(url, {
      ...init,
      headers: {
        "cache-control": "no-cache",
        pragma: "no-cache",
        ...(init?.headers ?? {}),
      },
    }),
  );

  return {
    response,
    latencyMs: Date.now() - startedAt,
  };
}

function parseHealthBody(rawBody: string) {
  try {
    return JSON.parse(rawBody) as
      | { status?: string; authReady?: boolean; deploymentMode?: string; runtime?: string }
      | null;
  } catch {
    return null;
  }
}

function monitorFailure(definition: MonitorDefinition, details: string, checkedAt: string, latencyMs: number | null): MonitorResult {
  return {
    id: definition.id,
    name: definition.name,
    url: definition.url,
    category: definition.category,
    ok: false,
    status: "degraded",
    summary: "Check failed",
    details,
    checkedAt,
    latencyMs,
    statusCode: null,
  };
}

async function runMonitor(definition: MonitorDefinition, env: Env): Promise<MonitorResult> {
  const checkedAt = new Date().toISOString();

  try {
    if (definition.kind === "redirect") {
      const { response, latencyMs } = await fetchWithTiming(definition.url, { redirect: "manual" });
      const location = response.headers.get("location");
      const ok = response.status === 302 && location === "/en";
      return {
        id: definition.id,
        name: definition.name,
        url: definition.url,
        category: definition.category,
        ok,
        status: ok ? "operational" : "degraded",
        summary: ok ? "Redirects to /en" : "Unexpected public redirect",
        details: ok
          ? "Public entrypoint is redirecting to the localized experience."
          : `Expected HTTP 302 with location /en, received ${response.status}${location ? ` to ${location}` : ""}.`,
        checkedAt,
        latencyMs,
        statusCode: response.status,
      };
    }

    if (definition.kind === "health") {
      let response: Response;
      let latencyMs: number;
      let rawBody: string;

      if (definition.serviceBinding) {
        const attempts = ["https://internal/api/health", "https://internal/health"] as const;
        let selected:
          | { response: Response; latencyMs: number; rawBody: string }
          | null = null;

        for (const attemptUrl of attempts) {
          const current = await fetchThroughService(
            env[definition.serviceBinding],
            attemptUrl,
            { headers: { accept: "application/json" } },
          );
          const currentRawBody = await current.response.text();
          const currentBody = parseHealthBody(currentRawBody);

          if (current.response.ok && currentBody?.status === "ok") {
            selected = { response: current.response, latencyMs: current.latencyMs, rawBody: currentRawBody };
            break;
          }

          if (!selected) {
            selected = { response: current.response, latencyMs: current.latencyMs, rawBody: currentRawBody };
          }
        }

        response = selected!.response;
        latencyMs = selected!.latencyMs;
        rawBody = selected!.rawBody;
      } else {
        const external = await fetchWithTiming(definition.url, {
          headers: { accept: "application/json" },
        });
        response = external.response;
        latencyMs = external.latencyMs;
        rawBody = await external.response.text();
      }

      const body = parseHealthBody(rawBody);

      const ok = response.ok && body?.status === "ok";
      const runtimeLabel = body?.runtime ? ` (${body.runtime})` : "";
      return {
        id: definition.id,
        name: definition.name,
        url: definition.url,
        category: definition.category,
        ok,
        status: ok ? "operational" : "degraded",
        summary: ok ? `Healthy${runtimeLabel}` : "Health probe failed",
        details: ok
          ? `Health endpoint returned status=ok${body?.deploymentMode ? ` in ${body.deploymentMode} mode` : ""}.`
          : `Expected JSON body with status=ok, received HTTP ${response.status}${rawBody ? ` and body ${rawBody.slice(0, 160)}` : ""}.`,
        checkedAt,
        latencyMs,
        statusCode: response.status,
      };
    }

    const { response, latencyMs } = await fetchWithTiming(definition.url, { redirect: "manual" });
    const contentType = response.headers.get("content-type") ?? "";
    const bodyText = await response.text();
    const ok =
      response.status === 200 &&
      contentType.includes("text/html") &&
      bodyText.includes('id="root"') &&
      !bodyText.includes("Redirecting to /en");

    return {
      id: definition.id,
      name: definition.name,
      url: definition.url,
      category: definition.category,
      ok,
      status: ok ? "operational" : "degraded",
      summary: ok ? "Admin shell served correctly" : "Admin shell is misrouted",
      details: ok
        ? "Admin hostname is serving the application shell directly."
        : `Expected HTML app shell on ${definition.url}, but received HTTP ${response.status} with content-type ${contentType || "unknown"}.`,
      checkedAt,
      latencyMs,
      statusCode: response.status,
    };
  } catch (error) {
    return monitorFailure(
      definition,
      error instanceof Error ? error.message : "Unknown fetch error",
      checkedAt,
      null,
    );
  }
}

async function loadSnapshot(env: Env): Promise<StatusSnapshot | null> {
  return env.STATUS_CACHE.get(SNAPSHOT_KEY, "json") as Promise<StatusSnapshot | null>;
}

async function loadHistory(env: Env, id: MonitorId): Promise<HistoryPoint[]> {
  const history = (await env.STATUS_CACHE.get(`${HISTORY_PREFIX}${id}`, "json")) as HistoryPoint[] | null;
  return history ?? [];
}

async function loadPayload(env: Env): Promise<StatusPayload | null> {
  const snapshot = await loadSnapshot(env);
  if (!snapshot) return null;

  const historyEntries = await Promise.all(
    snapshot.monitors.map(async (monitor) => [monitor.id, await loadHistory(env, monitor.id)] as const),
  );

  return {
    snapshot,
    history: Object.fromEntries(historyEntries) as Record<MonitorId, HistoryPoint[]>,
  };
}

async function updatePayload(env: Env): Promise<StatusPayload> {
  const definitions = monitorDefinitions(env);
  const monitors = await Promise.all(definitions.map((definition) => runMonitor(definition, env)));
  const snapshot: StatusSnapshot = {
    checkedAt: new Date().toISOString(),
    overall: monitors.every((monitor) => monitor.ok) ? "operational" : "degraded",
    monitors,
  };

  const updatedHistoryEntries = await Promise.all(
    monitors.map(async (monitor) => {
      const existing = await loadHistory(env, monitor.id);
      const next: HistoryPoint[] = [
        ...existing,
        {
          checkedAt: monitor.checkedAt,
          ok: monitor.ok,
          latencyMs: monitor.latencyMs,
        },
      ].slice(-HISTORY_LIMIT);
      return [monitor.id, next] as const;
    }),
  );

  await Promise.all([
    env.STATUS_CACHE.put(SNAPSHOT_KEY, JSON.stringify(snapshot)),
    ...updatedHistoryEntries.map(([id, history]) =>
      env.STATUS_CACHE.put(`${HISTORY_PREFIX}${id}`, JSON.stringify(history)),
    ),
  ]);

  return {
    snapshot,
    history: Object.fromEntries(updatedHistoryEntries) as Record<MonitorId, HistoryPoint[]>,
  };
}

function payloadIsStale(payload: StatusPayload | null): boolean {
  if (!payload) return true;
  return Date.now() - new Date(payload.snapshot.checkedAt).getTime() > STALE_AFTER_MS;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHistory(points: HistoryPoint[]): string {
  if (points.length === 0) {
    return `<div class="history history-empty"><span>No history yet</span></div>`;
  }

  return `
    <div class="history" aria-label="Recent checks">
      ${points
        .map(
          (point) => `
            <span
              class="history-bar ${point.ok ? "ok" : "fail"}"
              title="${escapeHtml(`${formatTimestamp(point.checkedAt)} · ${point.ok ? "Operational" : "Degraded"}${point.latencyMs !== null ? ` · ${point.latencyMs}ms` : ""}`)}"
            ></span>`,
        )
        .join("")}
    </div>
  `;
}

function renderPage(env: Env, payload: StatusPayload): string {
  const title = env.STATUS_PAGE_TITLE?.trim() || "Ciutatis Status";
  const tagline =
    env.STATUS_PAGE_TAGLINE?.trim() || "Live checks for the public experience, admin shell, and API edge.";
  const overallLabel =
    payload.snapshot.overall === "operational" ? "All systems operational" : "Degraded service detected";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #09131a;
        --panel: rgba(11, 22, 31, 0.88);
        --panel-border: rgba(115, 151, 171, 0.18);
        --text: #e8f1f6;
        --muted: #96a9b7;
        --ok: #29c47a;
        --fail: #ff7a59;
        --warn: #f4c95d;
        --accent: #64d2ff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(100, 210, 255, 0.18), transparent 32rem),
          radial-gradient(circle at top right, rgba(41, 196, 122, 0.14), transparent 24rem),
          linear-gradient(180deg, #081118 0%, #0b1620 52%, #0f1b24 100%);
        color: var(--text);
      }
      main {
        width: min(1100px, calc(100vw - 2rem));
        margin: 0 auto;
        padding: 3rem 0 4rem;
      }
      .hero {
        display: grid;
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        width: fit-content;
        padding: 0.45rem 0.8rem;
        border: 1px solid var(--panel-border);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.04);
        color: var(--muted);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-size: 0.72rem;
      }
      h1 {
        margin: 0;
        font-size: clamp(2.2rem, 4vw, 4rem);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }
      .subtitle {
        margin: 0;
        color: var(--muted);
        max-width: 52rem;
        font-size: 1.02rem;
        line-height: 1.6;
      }
      .summary {
        display: flex;
        flex-wrap: wrap;
        gap: 0.9rem;
        align-items: center;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.8rem 1rem;
        border-radius: 1rem;
        border: 1px solid var(--panel-border);
        background: var(--panel);
        backdrop-filter: blur(18px);
      }
      .dot {
        width: 0.8rem;
        height: 0.8rem;
        border-radius: 999px;
        background: var(--ok);
        box-shadow: 0 0 0 0.3rem rgba(41, 196, 122, 0.16);
      }
      .dot.fail {
        background: var(--fail);
        box-shadow: 0 0 0 0.3rem rgba(255, 122, 89, 0.16);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
      }
      .card {
        padding: 1.1rem;
        border-radius: 1.25rem;
        border: 1px solid var(--panel-border);
        background: var(--panel);
        backdrop-filter: blur(18px);
      }
      .card-head,
      .card-meta {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
      }
      .card-head h2 {
        margin: 0;
        font-size: 1rem;
      }
      .status-label {
        color: var(--muted);
        font-size: 0.85rem;
      }
      .status-label strong {
        color: var(--text);
      }
      .status-label strong.fail {
        color: var(--fail);
      }
      .metric {
        font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
        color: var(--accent);
        font-size: 0.88rem;
      }
      .detail {
        margin: 0.85rem 0 0;
        color: var(--muted);
        line-height: 1.5;
        min-height: 3rem;
      }
      .link {
        display: inline-block;
        margin-top: 0.85rem;
        color: var(--accent);
        text-decoration: none;
        font-size: 0.92rem;
      }
      .history {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(4px, 1fr));
        gap: 0.22rem;
        margin-top: 1rem;
      }
      .history-empty {
        color: var(--muted);
        font-size: 0.9rem;
      }
      .history-bar {
        display: block;
        width: 100%;
        min-height: 0.75rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
      }
      .history-bar.ok { background: linear-gradient(180deg, #34d399 0%, #169b5f 100%); }
      .history-bar.fail { background: linear-gradient(180deg, #ff9f82 0%, #e05d3f 100%); }
      footer {
        margin-top: 1.6rem;
        color: var(--muted);
        font-size: 0.9rem;
      }
      @media (max-width: 680px) {
        main { padding-top: 2rem; }
        .summary { flex-direction: column; align-items: stretch; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="eyebrow">Ciutatis edge status</div>
        <h1>${escapeHtml(overallLabel)}</h1>
        <p class="subtitle">${escapeHtml(tagline)}</p>
        <div class="summary">
          <div class="pill">
            <span class="dot ${payload.snapshot.overall === "operational" ? "" : "fail"}"></span>
            <div>
              <div>${escapeHtml(overallLabel)}</div>
              <div class="status-label">Last check: ${escapeHtml(formatTimestamp(payload.snapshot.checkedAt))} UTC</div>
            </div>
          </div>
          <div class="pill">
            <div>
              <div>${payload.snapshot.monitors.filter((monitor) => monitor.ok).length}/${payload.snapshot.monitors.length} checks passing</div>
              <div class="status-label">Worker-backed monitoring with 5-minute polling</div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid">
        ${payload.snapshot.monitors
          .map((monitor) => {
            const history = payload.history[monitor.id] ?? [];
            return `
              <article class="card">
                <div class="card-head">
                  <div>
                    <div class="status-label">${escapeHtml(monitor.category)}</div>
                    <h2>${escapeHtml(monitor.name)}</h2>
                  </div>
                  <div class="status-label">
                    <strong class="${monitor.ok ? "" : "fail"}">${escapeHtml(monitor.summary)}</strong>
                  </div>
                </div>
                <p class="detail">${escapeHtml(monitor.details)}</p>
                <div class="card-meta">
                  <div class="metric">${monitor.latencyMs === null ? "n/a" : `${monitor.latencyMs} ms`}</div>
                  <div class="status-label">HTTP ${monitor.statusCode ?? "n/a"}</div>
                </div>
                <a class="link" href="${escapeHtml(monitor.url)}" target="_blank" rel="noreferrer">Open probe target</a>
                ${renderHistory(history)}
              </article>
            `;
          })
          .join("")}
      </section>

      <footer>
        JSON feed: <code>/api/status</code>
      </footer>
    </main>
  </body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "1";

    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }

    let payload = forceRefresh ? await updatePayload(env) : await loadPayload(env);
    if (!forceRefresh && payloadIsStale(payload)) {
      if (payload) {
        ctx.waitUntil(updatePayload(env));
      } else {
        payload = await updatePayload(env);
      }
    }

    if (!payload) {
      payload = await updatePayload(env);
    }

    if (url.pathname === "/api/status") {
      return Response.json(payload, {
        headers: {
          "cache-control": "no-store",
        },
      });
    }

    return new Response(renderPage(env, payload), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(updatePayload(env));
  },
};
