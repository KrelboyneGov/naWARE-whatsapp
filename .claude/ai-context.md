# AI Assistant Context — emergency-map

Working notes for this repository. The reusable patterns (auth, data loading, caching) live in the
[general-knowledge hub](https://github.com/csdev19/general-knowledge) — link out, don't re-document.

## Auth

The web app proxies `/api/auth/*` to the API Worker (same-origin cookies on Cloudflare Workers via
Service Bindings). Better Auth runs in `apps/server-hono`; the web app has no local auth instance.
See [api/](https://github.com/csdev19/general-knowledge/blob/main/api/README.md).

## Data loading

Route `loader` + `queryClient.ensureQueryData` sharing a `queryOptions` factory with the component
hook, `keepPreviousData`, `invalidateQueries` on mutations. Full write-up:
[web/data-loading](https://github.com/csdev19/general-knowledge/blob/main/web/data-loading.md).

## Conventions

- **Protected routes:** create under `src/routes/_authenticated/`; session is guaranteed by the
  parent `beforeLoad`. Call `router.invalidate()` after session changes so the root `beforeLoad`
  re-runs.
- **Domain is the source of truth:** Zod schemas/types live in `packages/domain/` and are reused by
  backend validation and client forms.
- **Product rules:** read `docs/product-brief.md` before modelling events, warnings or help
  entries. The severity, precision and freshness invariants there are requirements, not notes.
