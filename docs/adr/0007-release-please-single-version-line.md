# ADR 0007: release-please with one version line for both Workers

- Status: accepted · Date: 2026-10-18 · Supersedes the trigger part of ADR 0001

## Context

ADR 0001 shipped each Worker on its own tag (`api-v*`, `web-v*`) cut by hand, and left
release-please out. Both Workers import `packages/domain` (and the web imports the API contract),
so their closures intersect: independent version lines could leave production running two
different builds of the same shared code (hub: release-please-playbook, "closure rule").

## Decision

- release-please on `main` maintains one release PR; merging it creates tag `vX.Y.Z` and a GitHub
  Release. Pre-1.0, `feat` bumps the minor.
- `release-please.yml` then calls `release-api.yml` and `release-web.yml` through `workflow_call`
  with the tag as `ref`, API first. Each keeps its own `verify` job (ADR 0001 rule 2 unchanged).
- The release PR is created with `GITHUB_TOKEN`; no personal access token. The repository setting
  "Allow GitHub Actions to create and approve pull requests" must be on.

## Alternatives rejected

- Independent lines per Worker: breaks the closure rule above.
- Tag-push triggers with a PAT: works, but adds a long-lived token to rotate for no gain here.

## Consequences

- Commit messages must stay Conventional Commits (already enforced by Lefthook).
- Rollback: dispatch `release-api.yml` / `release-web.yml` manually with an older tag.
- The release PR itself runs no checks (no PR workflows by ADR 0001); `verify` runs at deploy.

## Reopen when

The two Workers stop sharing workspace packages, or a third deployable with its own cadence
(mobile, desktop) appears.
