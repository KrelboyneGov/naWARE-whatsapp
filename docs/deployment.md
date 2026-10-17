# Deployment

Both apps run on Cloudflare Workers and ship through tag-driven GitHub Actions workflows gated by
`verify`. Why it is built this way: [ADR 0001](./adr/0001-release-pipeline.md).

| Deployable | App                | Worker name       | Tag          | Workflow                            |
| ---------- | ------------------ | ----------------- | ------------ | ----------------------------------- |
| API        | `apps/server-hono` | `server-hono-api` | `api-v*.*.*` | `.github/workflows/release-api.yml` |
| Web        | `apps/web-hono`    | `web-hono`        | `web-v*.*.*` | `.github/workflows/release-web.yml` |

Each workflow also has a `workflow_dispatch` trigger for manual runs from the Actions tab.

## One-time setup

1. **Cloudflare:** create an API token with the Workers Scripts and Workers Routes edit
   permissions; note the account id.
2. **Neon:** create the project and database. Copy the pooled connection string
   (`DATABASE_URL`) and the direct one (`DATABASE_URL_DIRECT`, used for migrations).
3. **GitHub environment `production`:** Settings → Environments → New → `production`. Add:

   | Name                    | Kind     | Used by                                             |
   | ----------------------- | -------- | --------------------------------------------------- |
   | `CLOUDFLARE_API_TOKEN`  | secret   | both deploys (Wrangler auth)                        |
   | `CLOUDFLARE_ACCOUNT_ID` | secret   | both deploys                                        |
   | `DATABASE_URL`          | secret   | API Worker (pooled)                                 |
   | `DATABASE_URL_DIRECT`   | secret   | API release, migrations step                        |
   | `BETTER_AUTH_SECRET`    | secret   | API Worker (`openssl rand -base64 32`)              |
   | `CORS_ORIGIN`           | variable | API Worker; comma-separated allowlist (web origin)  |
   | `VITE_SERVER_URL`       | variable | web build + web Worker; the API Worker's public URL |
   | `API_URL`               | variable | optional; enables the API smoke check               |
   | `WEB_URL`               | variable | optional; enables the web smoke check               |

   Restrict the environment to tags matching `api-v*` and `web-v*` once branch/tag rules are in
   place.

4. **Actions budget:** set a non-zero spending limit and the usage alerts before the first run
   (hub: release-gated-verification R3).

## First deploy

Deploy the **API first**, then the **web**: the web Worker reaches the API through the
`API_SERVICE` Service Binding declared in `apps/web-hono/wrangler.jsonc`, so `server-hono-api`
must already exist.

```bash
git tag api-v0.1.0 && git push origin api-v0.1.0
# wait for "Release API" to go green, then
git tag web-v0.1.0 && git push origin web-v0.1.0
```

After that, the two ship independently in any order.

## What a release does

1. `verify` — checkout the tagged SHA, `bun install --frozen-lockfile`, `bun run verify`
   (lint, format check, package builds, type-check, tests), build the app bundle.
2. `deploy` (needs `verify`, environment `production`):
   - API: run `db:migrate` with `DATABASE_URL_DIRECT`, write `worker-secrets.json`
     (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `CORS_ORIGIN`), `wrangler deploy --secrets-file`,
     delete the file, optional health probe at `$API_URL/api/v1/health`.
   - Web: build with `VITE_SERVER_URL`, write `worker-secrets.json` (`VITE_SERVER_URL`),
     `wrangler deploy --secrets-file`, delete the file, optional probe of `$WEB_URL`.

Secrets never go through a separate `wrangler secret put` step. `--secrets-file` is additive: a
value missing from the file keeps what the Worker already has, and empty values are dropped
before writing the file.

## Database migrations

- Local iteration: `bun run db:push` (reads `apps/server-hono/.env`).
- Shipping a schema change: `bun run db:generate`, commit the files under
  `packages/infra-db/src/migrations/`, release the API. The release applies them before the
  Worker deploy.
- Neon branches are the recommended way to try a migration against production-shaped data.

## Local development

```bash
cp apps/server-hono/.env.example apps/server-hono/.env   # DATABASE_URL, DATABASE_URL_DIRECT, BETTER_AUTH_SECRET, CORS_ORIGIN=http://localhost:3001
cp apps/web-hono/.env.example apps/web-hono/.env         # VITE_SERVER_URL=http://localhost:3000
bun install && bun run db:push && bun run dev
```

Wrangler loads `.env` automatically. Never add a `vars` block to a `wrangler.jsonc`.

## Rehearsing a risky change

For a PR that touches the lockfile, the workflows, or build config, dispatch
`.github/workflows/pr-validation.yml` from the Actions tab before merging. The optional
`pr-integration.yml` runs the API integration tests against a Neon branch when the repository
variable `RUN_INTEGRATION_TESTS` is `true` and the `testing` environment has
`TEST_DATABASE_URL`.

## Moving this scaffold into the real repository

The scaffold has a fresh git history with no remote. When the target repository exists:

```bash
git remote add origin git@<ssh-alias>:<owner>/<repo>.git
git config user.email "<the address mapped to that alias>"
git push -u origin main
```

Then create the `production` environment and its secrets as above. The code does not reference
the repository name anywhere, so nothing else changes.
