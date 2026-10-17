# Development Rules

Emergency and aid map for Peru: a web platform that shows official weather warnings, reported
emergencies and available help on a national map. Product context lives in
`docs/product-brief.md`; deployment in `docs/deployment.md`; durable decisions in `docs/adr/`.

Monorepo (Bun workspaces + Turborepo, TypeScript) with DDD + Hexagonal Architecture, scaffolded
from [monorepo-template](https://github.com/niway-dev/monorepo-template) (Client-Server Hono pattern).

## Layout

- `apps/web-hono` — TanStack Start web app on Cloudflare Workers. A pure proxy client: forwards
  `/api/auth/*` and `/api/v1/*` to the API Worker through the `API_SERVICE` Service Binding. Never
  runs Better Auth or touches the database. Dev port 3001.
- `apps/server-hono` — Hono + oRPC API on Cloudflare Workers (`server-hono-api`). Better Auth,
  Drizzle + Neon. Dev port 3000.
- `packages/domain` → `application` → `infra-db`, `infra-auth`, `infra-cloudflare`, `infra-env`;
  `web-ui` (shadcn/ui), `config` (tsconfig). See `.claude/architecture.md`.

## Knowledge lives in the hub, not here

Reusable, product-agnostic knowledge is **not** duplicated in this file — it lives in the
[general-knowledge hub](https://github.com/csdev19/general-knowledge). Start from the
[fullstack-hono-orpc recipe](https://github.com/csdev19/general-knowledge/blob/main/stacks/fullstack-hono-orpc.md).
Key topics (don't re-document them here):

- **Feature workflow** — [MVP first, then refactor](https://github.com/csdev19/general-knowledge/blob/main/conventions/mvp-first-then-refactor.md).
- **Architecture & the dependency rule** — [architecture/](https://github.com/csdev19/general-knowledge/blob/main/architecture/README.md).
- **Client-Server proxy** — [api/](https://github.com/csdev19/general-knowledge/blob/main/api/README.md).
- **Release pipelines** — [release-gated-verification](https://github.com/csdev19/general-knowledge/blob/main/monorepos/release-gated-verification.md),
  [worker-secrets-with-deploy](https://github.com/csdev19/general-knowledge/blob/main/monorepos/worker-secrets-with-deploy.md),
  [ci-cd-pipelines](https://github.com/csdev19/general-knowledge/blob/main/monorepos/ci-cd-pipelines.md).
- **web-ui `dist/` build strategy** — [web/web-ui-package.md](https://github.com/csdev19/general-knowledge/blob/main/web/web-ui-package.md).
- **Cloudflare Wrangler & env config** — [monorepos/wrangler-env-config.md](https://github.com/csdev19/general-knowledge/blob/main/monorepos/wrangler-env-config.md).

## Package Import Rules

- `domain` never imports from `application` or `infra-*`
- `application` never imports from `infra-*` (uses domain interfaces)
- `infra-*` never imports from `application`
- Apps are the only place where repositories are wired into use cases.

## Project-specific rules

- **Skill Configuration:** Skills in `.claude/skills/` may have a **Configuration** table with paths.
  If a configured path no longer matches the project, update the table directly.
- **Env / Wrangler (sharp gotcha):** ALWAYS use `.env` (and `.dev.vars` for local Worker secrets).
  NEVER add a `vars` / `[vars]` / `[env.*]` block to `wrangler.jsonc` — Wrangler auto-loads `.env`,
  so a `vars` block drifts from the single source of truth. Wrangler is pinned in the root catalog
  and mirrored as `WRANGLER_VERSION` in the release workflows; bump both together. Keep
  `compatibility_date` identical across both `wrangler.jsonc`, and run `wrangler types` after
  editing one.
- **Production secrets ship with the deploy:** the release workflows write a `worker-secrets.json`
  and pass `--secrets-file` to `wrangler deploy`. Never add a `wrangler secret put` step or the
  action's `secrets:` input. `worker-secrets.json` is gitignored.
- **`bun run verify` is the one definition of green:** lint, format check, package builds,
  type-check, tests. The Lefthook pre-push runs it, and both release workflows run it in a `verify`
  job that `deploy` needs. No workflow runs on pull requests (`docs/adr/0001-release-pipeline.md`).
  Change the checks in `verify`, never in one caller.
- **Schema changes ship as migrations:** `bun run db:push` is for local iteration only. Commit a
  migration with `bun run db:generate` (files under `packages/infra-db/src/migrations/`); the API
  release applies them with `db:migrate` before deploying the Worker.
- **Table prefix:** every table is created through `createTable` (`packages/infra-db/src/utils/`)
  and gets the `emergency_map_` prefix from `TABLE_PREFIX`.
- **web-ui needs `dist/`:** `@emergency-map/web-ui` exports point to built files, and `dist/` is
  NOT committed. Run `bun run build --filter='@emergency-map/*'` before `bun run check-types`, or the
  web app fails with "Cannot find module". Rebuild after editing web-ui components.
- **Data invariants from the brief** (apply when modelling sources and events): keep each
  issuer's own severity level and legend, never a merged "risk score"; a record located only at
  district level stays at district precision, never an invented point; a zone with no records shows
  "no information available", never "safe"; a follow-up report updates the existing event instead
  of creating a duplicate.

## Common Commands

- `bun run dev` — both apps · `bun run dev:server-hono` / `dev:web-hono` — one app
- `bun run verify` — the full green check
- `bun run db:push` / `db:generate` / `db:migrate` / `db:studio` — run from the monorepo root
