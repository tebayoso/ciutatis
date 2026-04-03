import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./lib/types.js";
import { configureSessionKV } from "./session/kv.js";
import { dbMiddleware } from "./middleware/db.js";
import { actorMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { boardMutationGuard } from "./middleware/board-mutation-guard.js";
import {
  healthRoutes,
  institutionRoutes,
  agentRoutes,
  assetRoutes,
  projectRoutes,
  requestRoutes,
  executionWorkspaceRoutes,
  objectiveRoutes,
  approvalCompanyRoutes,
  approvalByIdRoutes,
  secretCompanyRoutes,
  secretByIdRoutes,
  costCompanyRoutes,
  agentBudgetRoutes,
  activityRoutes,
  dashboardRoutes,
  sidebarBadgeRoutes,
  instanceSettingsRoutes,
  llmRoutes,
  pluginRoutes,
  pluginUiStaticRoutes,
  accessRoutes,
} from "./routes/index.js";

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", async (c, next) => {
    configureSessionKV(c.env.CIUTATIS_SESSIONS);
    await next();
  });

  app.use("*", cors());
  app.onError(errorHandler);

  app.use("*", dbMiddleware);
  app.use("*", actorMiddleware);

  app.get("/api/auth/get-session", (c) => {
    const actor = c.get("actor");
    if (actor.type !== "board" || !actor.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.json({
      session: {
        id: `ciutatis:${actor.source}:${actor.userId}`,
        userId: actor.userId,
      },
      user: {
        id: actor.userId,
        email: null,
        name: actor.source === "local_implicit" ? "Local Board" : null,
      },
    });
  });

  app.post("/api/auth/sign-up/*", (c) => {
    const disableSignup = c.env.AUTH_DISABLE_SIGNUP;
    if (disableSignup === "true") {
      return c.json(
        { error: "Sign up is currently disabled. Contact support for access." },
        403,
      );
    }
    return c.json({ error: "Sign up is not available in this deployment" }, 501);
  });

  app.route("/", llmRoutes());

  const api = new Hono<AppEnv>();
  api.use("*", boardMutationGuard);

  api.route("/health", healthRoutes());
  api.route("/companies", institutionRoutes());
  api.route("/institutions", institutionRoutes());
  api.route("/", agentRoutes());
  api.route("/", assetRoutes());
  api.route("/", projectRoutes());
  api.route("/", requestRoutes());
  api.route("/", executionWorkspaceRoutes());
  api.route("/", objectiveRoutes());
  api.route("/", approvalCompanyRoutes());
  api.route("/", approvalByIdRoutes());
  api.route("/", secretCompanyRoutes());
  api.route("/", secretByIdRoutes());
  api.route("/", costCompanyRoutes());
  api.route("/", agentBudgetRoutes());
  api.route("/", activityRoutes());
  api.route("/", dashboardRoutes());
  api.route("/", sidebarBadgeRoutes());
  api.route("/", instanceSettingsRoutes());
  api.route("/", pluginRoutes());
  api.route("/", accessRoutes());

  app.route("/api", api);

  app.all("/api/*", (c) => c.json({ error: "API route not found" }, 404));

  app.route("/", pluginUiStaticRoutes());

  return app;
}
