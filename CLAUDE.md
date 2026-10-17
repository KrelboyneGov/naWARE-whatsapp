# Development Rules

Emergency and aid map for Peru: a web platform that shows official weather warnings, reported
emergencies and available help on a national map. Product context lives in
`docs/product-brief.md`; deployment in `docs/deployment.md`; durable decisions in `docs/adr/`.

Monorepo (pnpm workspaces + Turborepo, TypeScript) with DDD + Hexagonal Architecture, scaffolded
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

- **Package manager is pnpm, toolchain comes from mise:** `mise.toml` pins Node and pnpm and is
  read by developers (`mise install`) and by CI (`jdx/mise-action`). Dependency versions are pinned
  once in the `catalog` of `pnpm-workspace.yaml`; packages reference them with `catalog:`. pnpm 12
  refuses to install when a dependency with a lifecycle script is not listed under `allowBuilds`
  there. Never run `bun`/`npm`/`yarn` here. Why pnpm over the template's Bun:
  `docs/adr/0002-pnpm-and-mise.md`.
- **Pinned TanStack Start line (sharp gotcha):** `apps/web-hono` pins `@tanstack/react-start`
  1.159.0 and `pnpm-workspace.yaml` overrides `@tanstack/start-plugin-core` to 1.159.0. Newer
  lines require Vite 8; a fresh resolution without those pins breaks `vite build` with "Could not
  resolve entry module index.html". Lift the pins together with a Vite 8 upgrade.
- **`@cloudflare/vite-plugin` must pair with the Wrangler in the catalog (sharp gotcha):** the
  plugin bundles its own Miniflare, and `wrangler dev` (API) uses Wrangler's. When the two Miniflare
  versions differ they write the local dev registry in incompatible formats, the web Worker's
  `API_SERVICE` binding cannot reach the API, and every proxied request fails with
  "Network connection lost" while `curl localhost:3000` works. Pick the plugin version whose
  `dependencies.miniflare` equals `wrangler@<catalog>`'s (`pnpm view ... dependencies.miniflare`);
  today wrangler 4.110.0 ↔ plugin 1.44.0. Bump both in the same commit.
- **Neon connection strings are the bare URL:** Neon's console offers a `psql '...'` snippet;
  paste only the `postgresql://...` part into `.env`, or `neon()` fails with "not a valid URL".
- **Skill Configuration:** Skills in `.claude/skills/` may have a **Configuration** table with paths.
  If a configured path no longer matches the project, update the table directly.
- **Env / Wrangler (sharp gotcha):** ALWAYS use `.env` (and `.dev.vars` for local Worker secrets).
  NEVER add a `vars` / `[vars]` / `[env.*]` block to `wrangler.jsonc` — Wrangler auto-loads `.env`,
  so a `vars` block drifts from the single source of truth. Wrangler is pinned in the pnpm-workspace.yaml catalog
  and mirrored as `WRANGLER_VERSION` in the release workflows; bump both together. Keep
  `compatibility_date` identical across both `wrangler.jsonc`, and run `wrangler types` after
  editing one.
- **Production secrets ship with the deploy:** the release workflows write a `worker-secrets.json`
  and pass `--secrets-file` to `wrangler deploy`. Never add a `wrangler secret put` step or the
  action's `secrets:` input. `worker-secrets.json` is gitignored.
- **`pnpm run verify` is the one definition of green:** lint, format check, package builds,
  type-check, tests. The Lefthook pre-push runs it, and both release workflows run it in a `verify`
  job that `deploy` needs. No workflow runs on pull requests (`docs/adr/0001-release-pipeline.md`).
  Change the checks in `verify`, never in one caller.
- **Schema changes ship as migrations:** `pnpm run db:push` is for local iteration only. Commit a
  migration with `pnpm run db:generate` (files under `packages/infra-db/src/migrations/`); the API
  release applies them with `db:migrate` before deploying the Worker.
- **Table prefix:** every table is created through `createTable` (`packages/infra-db/src/utils/`)
  and gets the `emergency_map_` prefix from `TABLE_PREFIX`.
- **web-ui needs `dist/`:** `@emergency-map/web-ui` exports point to built files, and `dist/` is
  NOT committed. Run `pnpm run build --filter='@emergency-map/*'` before `pnpm run check-types`, or the
  web app fails with "Cannot find module". Rebuild after editing web-ui components.
- **Data invariants from the brief** (apply when modelling sources and events): keep each
  issuer's own severity level and legend, never a merged "risk score"; a record located only at
  district level stays at district precision, never an invented point; a zone with no records shows
  "no information available", never "safe"; a follow-up report updates the existing event instead
  of creating a duplicate.

## Common Commands

- `mise install && pnpm install` — toolchain and dependencies
- `pnpm run dev` — both apps · `pnpm run dev:server-hono` / `dev:web-hono` — one app
- `pnpm run verify` — the full green check
- `pnpm run db:push` / `db:generate` / `db:migrate` / `db:studio` — run from the monorepo root
