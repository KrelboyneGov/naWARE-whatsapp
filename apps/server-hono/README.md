# server-hono

Hono + oRPC API running on Cloudflare Workers (`server-hono-api`). Better Auth is served at
`/api/auth/*`; the oRPC OpenAPI handler is mounted at `/api/v1/*`; `/api/v1/health` is the
health check the release workflow probes.

## Local development

```sh
cp .env.example .env   # fill in DATABASE_URL (Neon) and BETTER_AUTH_SECRET
bun run dev            # wrangler dev on http://localhost:3000
```

Wrangler loads `.env` automatically. Never add a `vars` block to `wrangler.jsonc`.

## Deployment

Shipped by `.github/workflows/release-api.yml` on an `api-v*.*.*` tag (see `docs/deployment.md`).
Secrets travel inside the same `wrangler deploy` through `--secrets-file`; do not run
`wrangler secret put` as a separate step.
