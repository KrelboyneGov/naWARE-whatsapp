# Architecture Context

A Client-Server Hono + oRPC project (apps/web-hono + apps/server-hono), DDD + Hexagonal
Architecture, scaffolded from monorepo-template.

> The general architecture knowledge (DDD + hexagonal, bounded contexts, repository pattern, Result
> types, dependency injection, schema-driven validation) lives in the
> [general-knowledge hub](https://github.com/csdev19/general-knowledge) — start at
> [architecture/](https://github.com/csdev19/general-knowledge/blob/main/architecture/README.md).
> This file only maps what is specific to _this project_.

## Shared packages (layer-first)

- `domain/` — Pure: Zod schemas, types, constants, repository interfaces (leaf, no deps)
- `application/` — Use cases (depend only on domain interfaces)
- `infra-db/` — Drizzle schemas, repositories, mappers, Neon client, migrations
- `infra-auth/` — Better Auth base config
- `infra-cloudflare/` — Service Binding fetch + proxy handler
- `infra-env/` — Zod env schemas (one per app)
- `web-ui/` — Shared React UI (shadcn/ui, Tailwind) — exports built dist/
- `config/` — Shared tsconfig

**Dependency rule (strict):** `domain <- application <- infra-*`; only apps wire them together.
`domain` is a leaf, so importing it can never transitively pull in server code.

## Apps

- `apps/web-hono` — TanStack Start on Cloudflare Workers. Proxies `/api/auth/*` and `/api/v1/*`
  to the API Worker via the `API_SERVICE` Service Binding (same-origin cookies). Needs only
  `VITE_SERVER_URL`.
- `apps/server-hono` — Hono + oRPC on Cloudflare Workers (`server-hono-api`). Hosts Better Auth
  and the oRPC OpenAPI handler. Needs `DATABASE_URL`, `BETTER_AUTH_SECRET`, `CORS_ORIGIN`.

## Product domains to come (from docs/product-brief.md)

The Todo example that ships with the template is the reference for the layering. The product
will replace it with: forecasts, official warnings, reported emergencies, available help
(organizations, contact points), territorial units (department / province / district) and
source importers. Geospatial queries (intersections, distance) are planned on Neon + PostGIS.

See the [monorepo structure](https://github.com/csdev19/general-knowledge/blob/main/monorepos/monorepo-structure.md)
doc in the hub for the workspace / Turbo / catalog layout.
