# emergency-map

Emergency and aid map for Peru. A web platform to understand what is happening in a given area,
read official warnings, and find organizations or communities to receive help from or collaborate
with. Product context: [`docs/product-brief.md`](./docs/product-brief.md).

Monorepo scaffolded from [monorepo-template](https://github.com/niway-dev/monorepo-template)
(Client-Server Hono pattern): TypeScript, pnpm, Turborepo, DDD + Hexagonal Architecture.
The template is Bun-native; this repository switched to pnpm ([ADR 0002](./docs/adr/0002-pnpm-and-mise.md)).

## Stack

| Layer    | Technology                                           |
| -------- | ---------------------------------------------------- |
| Web      | TanStack Start, TanStack Router + Query, React       |
| API      | Hono + oRPC (OpenAPI), Better Auth                   |
| Runtime  | Cloudflare Workers (Wrangler), Service Binding proxy |
| Database | Neon PostgreSQL, Drizzle ORM                         |
| UI       | shadcn/ui, Tailwind CSS (`packages/web-ui`)          |
| Tooling  | oxlint, oxfmt, Lefthook, Vitest                      |

## Getting started

Toolchain versions (Node, pnpm) are pinned in `mise.toml`; [mise](https://mise.jdx.dev) installs
them locally and in CI from the same file.

```bash
mise install
pnpm install
# apps/server-hono/.env  -> DATABASE_URL, DATABASE_URL_DIRECT, BETTER_AUTH_SECRET, CORS_ORIGIN
# apps/web-hono/.env     -> VITE_SERVER_URL (http://localhost:3000 in dev)
pnpm run db:push   # local iteration; commit schema changes with db:generate
pnpm run dev       # API on :3000, web on :3001
```

Copy each app's `.env.example` to `.env` if it does not exist yet.

## Apps and packages

```
apps/
├── web-hono/      # TanStack Start web app (proxy client, Cloudflare Worker)
└── server-hono/   # Hono + oRPC API (Cloudflare Worker `server-hono-api`)
packages/
├── domain/            # Zod schemas, types, repository interfaces (no deps)
├── application/       # Use cases (depend only on domain)
├── infra-db/          # Drizzle schema, repositories, mappers, Neon client, migrations
├── infra-auth/        # Better Auth base config
├── infra-cloudflare/  # Service Binding fetch + proxy handler
├── infra-env/         # Zod env schemas per app
├── web-ui/            # Shared React UI (built to dist/)
└── config/            # Shared tsconfig
```

Dependency rule: `domain <- application <- infra-*`; only apps wire them together.

## Scripts

- `pnpm run dev` — both apps · `dev:server-hono` / `dev:web-hono` — one app
- `pnpm run verify` — lint, format check, package builds, type-check, tests (pre-push runs it)
- `pnpm run build` · `check-types` · `test` · `lint` · `format`
- `pnpm run db:push` · `db:generate` · `db:migrate` · `db:studio`

## Deployment

Tag-driven releases to Cloudflare Workers, each gated by `verify`:

```bash
git tag api-v0.1.0 && git push origin api-v0.1.0   # .github/workflows/release-api.yml
git tag web-v0.1.0 && git push origin web-v0.1.0   # .github/workflows/release-web.yml
```

Required secrets, variables and first-deploy order: [`docs/deployment.md`](./docs/deployment.md).
Decision records: [`docs/adr/`](./docs/adr/).

## Documentation

- `docs/product-brief.md` — product, users, data sources, MVP scope
- `docs/deployment.md` — environments, secrets, release procedure
- `docs/adr/` — architecture decision records
- `CLAUDE.md` — working rules for AI agents and contributors
