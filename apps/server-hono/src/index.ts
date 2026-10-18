import { Hono } from "hono";
import { cors } from "hono/cors";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { AGENT_TOOLS, callAgentTool, handleZavuWebhook } from "@emergency-map/application";
import { resolveTargetDate } from "@emergency-map/domain/rules";
import { auth } from "./lib/auth";
import { appRouter } from "./router";
import { env } from "./env";
import { createContext } from "./lib/actor";
import {
  getMessagingDeps,
  messagingConfigurationError,
  runNotificationCron,
} from "./lib/messaging";

const app = new Hono();

// Web requests arrive same-origin through the web Worker's Service Binding proxy, so CORS
// only matters for clients that call this Worker directly. CORS_ORIGIN is the allowlist
// (comma-separated) and must agree with Better Auth's trustedOrigins in lib/auth.ts.
app.use(
  "*",
  cors({
    origin: [...env.CORS_ORIGIN],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    credentials: true,
    maxAge: 86400,
  }),
);

// Better Auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Health endpoint
app.get("/api/v1/health", (c) =>
  c.json({ status: "healthy", timestamp: new Date().toISOString() }),
);

// Zavu delivers message.inbound here. Registered before the oRPC catch-all so the raw body
// is available for the HMAC. The sender webhook is configured per sender in the Zavu dashboard.
app.post("/api/v1/webhooks/zavu", async (c) => {
  if (messagingConfigurationError() || !env.ZAVU_WEBHOOK_SECRET) {
    return c.json({ error: "not_configured" }, 503);
  }
  const rawBody = await c.req.text();
  const result = await handleZavuWebhook(getMessagingDeps(), {
    rawBody,
    signatureHeader: c.req.header("x-zavu-signature") ?? null,
    secret: env.ZAVU_WEBHOOK_SECRET,
  });
  return c.json(result.body, result.status as 200);
});

app.post("/api/v1/internal/notifications/dispatch", async (c) => {
  if (!authorizedJob(c.req.header("authorization"))) {
    return c.json({ error: "unauthorized" }, 401);
  }
  if (messagingConfigurationError()) return c.json({ error: "not_configured" }, 503);
  await runNotificationCron();
  return c.json({ ok: true });
});

app.post("/api/v1/internal/agent/tools", async (c) => {
  if (!authorizedJob(c.req.header("authorization"))) {
    return c.json({ error: "unauthorized" }, 401);
  }
  if (messagingConfigurationError()) return c.json({ error: "not_configured" }, 503);
  const body = (await c.req.json().catch(() => null)) as {
    method?: string;
    name?: string;
    arguments?: Record<string, unknown>;
    home?: { name?: string; ubigeo?: string | null };
    dayLabel?: string;
  } | null;
  if (!body?.method) return c.json({ error: "invalid_json" }, 400);
  if (body.method === "tools/list") return c.json({ tools: AGENT_TOOLS });
  if (body.method === "tools/call" && body.name) {
    const result = await callAgentTool(
      getMessagingDeps(),
      body.name,
      body.arguments ?? {},
      { name: body.home?.name ?? "hogar", ubigeo: body.home?.ubigeo ?? null },
      resolveTargetDate(body.dayLabel ?? "hoy", new Date()),
    );
    return c.json({ result });
  }
  return c.json({ error: "unknown_method" }, 400);
});

function authorizedJob(header: string | undefined): boolean {
  return Boolean(env.INTERNAL_JOB_TOKEN) && header === `Bearer ${env.INTERNAL_JOB_TOKEN}`;
}

// oRPC OpenAPIHandler — REST-style URLs at /api/v1/*
const openAPIHandler = new OpenAPIHandler(appRouter);

app.all("/api/v1/*", async (c) => {
  const { matched, response } = await openAPIHandler.handle(c.req.raw, {
    prefix: "/api/v1",
    context: createContext(c.req.raw.headers),
  });

  if (matched) return response;
  return c.notFound();
});

export { app };

export default {
  fetch: app.fetch.bind(app),
  async scheduled() {
    await runNotificationCron();
  },
};
