# ADR 0002: pnpm as package manager, mise for the toolchain

- Status: accepted
- Date: 2026-10-17

## Context

The scaffold comes from monorepo-template, which is Bun-native: Bun workspaces with a `catalog`
in `package.json`, `bun.lock`, `bun run` in scripts, hooks and workflows, and `bun-types` in the
tsconfigs. The team that will own the repository works with pnpm, and the stack should not be
decided by the template.

Bun was only the package manager and script runner here. Nothing in the code uses Bun runtime
APIs: production runs on Cloudflare Workers (workerd), tests on Vitest, builds on Vite and tsdown,
and the workspace packages are consumed from source through `exports` resolution that every
Node-compatible tool performs the same way.

## Decision

1. **pnpm** is the package manager. Workspaces and the dependency catalog live in
   `pnpm-workspace.yaml`; packages keep `catalog:` and `workspace:*` references unchanged.
2. **mise** pins the toolchain in `mise.toml` (Node and pnpm, latest at the time of writing).
   Developers run `mise install`; CI uses `jdx/mise-action` so both read the same file.
3. Dependencies with lifecycle scripts are approved explicitly under `allowBuilds`
   (esbuild, workerd, lefthook, `@tailwindcss/oxide`); the rest are denied.
4. The migration kept the dependency versions Bun had resolved for TanStack Start and the
   Cloudflare Vite plugin, by pinning them. Two peer mismatches Bun hid were fixed instead:
   `@cloudflare/workers-types` moved to the 5.x line Wrangler requires, and `@tailwindcss/vite`
   aligned with `tailwindcss`.

## Alternatives rejected

- **Stay on Bun.** Works and installs faster, but the team does not use it, and a package manager
  switch after the lockfile is shared costs a coordinated reinstall for everyone.
- **Upgrade to Vite 8 and the newest TanStack Start as part of the switch.** Mixes a toolchain
  change with a framework upgrade; one failure would be impossible to attribute. Tracked as a
  follow-up.
- **Pin Node/pnpm with `.nvmrc` + `packageManager` only.** Two files, two tools; mise covers both
  and any future tool (e.g. a Rust toolchain) from one file.

## Consequences

- `bun` must not be run in this repository; `packageManager` in `package.json` makes pnpm refuse
  other managers.
- Standalone TypeScript scripts need `pnpm exec tsx` (or Node's type stripping); Bun ran them
  directly. None exist today.
- pnpm reports peer-dependency problems that Bun silently accepted. Treat `pnpm peers check`
  as part of upgrading dependencies.

## Non-goals

- Changing bundlers, test runner or the Workers deployment model.

## Reopen when

- The team adopts Bun as runtime (Bun-specific APIs or `bun test`), or
- A Vite 8 upgrade lands, at which point the TanStack pins in `apps/web-hono` and the override in
  `pnpm-workspace.yaml` are removed.
