interface Env {
  TENANT_ID?: string;
  TENANT_NAME?: string;
  TENANT_PATH_PREFIX?: string;
  DB?: D1Database;
  TENANT_CACHE?: KVNamespace;
  ASSETS?: R2Bucket;
}

const baseHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ciutatis Tenant Runtime</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: ui-sans-serif, system-ui, sans-serif;
        background: linear-gradient(135deg, #f5f0e6 0%, #e6efe9 100%);
        color: #14211a;
      }
      main {
        width: min(760px, calc(100vw - 32px));
        border: 1px solid rgba(20, 33, 26, 0.12);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.9);
        padding: 32px;
        box-shadow: 0 32px 90px rgba(20, 33, 26, 0.08);
      }
      code {
        padding: 2px 6px;
        border-radius: 999px;
        background: rgba(20, 33, 26, 0.08);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Ciutatis tenant runtime template</h1>
      <p>This Worker is intended for per-tenant deployments inside a dispatch namespace.</p>
      <p>Health: <code>/__tenant/health</code></p>
    </main>
  </body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/__tenant/health") {
      return Response.json({
        ok: true,
        tenantId: env.TENANT_ID ?? null,
        tenantName: env.TENANT_NAME ?? null,
        pathPrefix: env.TENANT_PATH_PREFIX ?? null,
        hasD1: Boolean(env.DB),
        hasKv: Boolean(env.TENANT_CACHE),
        hasR2: Boolean(env.ASSETS),
      });
    }

    return new Response(baseHtml, {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  },
};
