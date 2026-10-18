import { Hono } from "hono";
import { cors } from "hono/cors";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { auth } from "./lib/auth";
import { appRouter } from "./router";
import { env } from "./env";
import { createContext } from "./lib/actor";

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

export default app;
