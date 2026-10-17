# ADR 0001: Tag-driven, verify-gated release pipelines for the two Workers

- Status: accepted
- Date: 2026-10-17

## Context

The repository ships two independent deployables to Cloudflare Workers: the API
(`apps/server-hono`, Worker `server-hono-api`) and the web app (`apps/web-hono`, Worker
`web-hono`). The template generated a single `deploy-production.yml` that deployed both on every
push to a `production` branch, with no verification job in front of the deploy, an unpinned
`bun add -g wrangler`, and Worker secrets uploaded through the action's `secrets:` input.

The hub records why each of those is a problem: a publish step with no `verify` in front of it
(release-gated-verification R1), tool versions that differ between two runs of the same release
(wrangler-env-config), and a separate secrets edit that deploys on its own and is refused once a
version has been uploaded without being deployed (worker-secrets-with-deploy).

The repository has one owner and no branch protection at this stage.

## Decision

1. **Two workflows, one per deployable:** `release-api.yml` on `api-v*.*.*` tags and
   `release-web.yml` on `web-v*.*.*` tags. Both also accept `workflow_dispatch`. There is no
   `production` branch.
2. **Every release has a `verify` job that `deploy` needs.** `verify` runs the root
   `pnpm run verify` (lint, format check, package builds, type-check, tests) on the tagged SHA and
   builds the app bundle. The same script runs in the Lefthook pre-push hook.
3. **Worker secrets ship inside the deploy** through `wrangler deploy --secrets-file`, written
   with `jq` for one step and removed with `if: always()`. Empty values are dropped so a missing
   GitHub secret never blanks a production value.
4. **Wrangler is pinned twice, on purpose:** in the pnpm-workspace.yaml catalog and as `WRANGLER_VERSION` in each
   workflow, and bumped together.
5. **Database migrations run in the API release**, before the Worker deploy, against the direct
   Neon connection string. Local iteration may use `db:push`; anything that ships is a committed
   migration.
6. **No workflow runs on pull requests.** `pr-validation.yml` and `pr-integration.yml` are
   `workflow_dispatch` only, for rehearsing a risky change (lockfile, workflows, build config) in
   a clean environment.

## Alternatives rejected

- **Deploy on push to a `production` branch (template default).** Couples both deployables to
  one trigger, so a web-only change redeploys the API, and a long-lived branch invites drift from
  `main`. Tags name exactly what ships and are already the hub convention.
- **PR-time cloud checks.** With one owner and no branch protection they are advisory and bill
  every push; the pre-push hook runs the same checks for free. Reopen condition below.
- **Secrets through the action's `secrets:` input or `wrangler secret put`.** Deploys secrets
  and code as two versions, non-atomically, and fails after any preview upload.
- **A single workflow deploying both Workers.** Simpler file, but the web Worker depends on the
  API Worker's existence only on the first deploy; afterwards independent release cadence matters
  more.

## Consequences

- First deploy order is API, then web: the web Worker's `API_SERVICE` Service Binding points at
  `server-hono-api`, which must exist.
- Cutting a release is `git tag api-v0.1.0 && git push origin api-v0.1.0` (same with `web-`).
  Keeping tag and `package.json` version in sync is manual until release-please is adopted.
- The GitHub `production` environment holds `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `DATABASE_URL`, `DATABASE_URL_DIRECT`, `BETTER_AUTH_SECRET` (secrets) and `CORS_ORIGIN`,
  `VITE_SERVER_URL`, optional `API_URL` / `WEB_URL` (variables). See `docs/deployment.md`.
- Every PR touching the lockfile, workflows or build config gets one manual dispatch of
  `pr-validation.yml` before merge.

## Non-goals

- A staging environment, preview deployments per PR, and release automation (release-please)
  are not part of this decision.
- Cron Triggers, Queues and R2 for source importers are product decisions recorded later.

## Reopen when

- A second person merges to `main`, or branch protection makes a check required: turn
  `pr-validation.yml` back into a `pull_request` trigger (`verify` only, cached).
- A staging environment is needed: add a job keyed on a tag prefix or dispatch input, not a
  branch.
- The repository becomes public: apply the hub's public-repo production protection before the
  first release.
