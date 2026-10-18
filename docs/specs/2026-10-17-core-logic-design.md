# Core logic and base screens — design

Refs #1. Status: approved in chat on 2026-10-17 (owner accepted the recommended options and the
default answers to every gap). Written on Fable.

## Summary (one minute)

Andes Alerta is a map of Peru where citizen reports with evidence and editorial review coexist
with official notices that keep their issuer's legend, and with a help directory (organizations,
needs, collection points). This phase builds the whole logic layer (domain, use cases,
persistence, API) for P0 + P1 without external integrations, plus four base screens: login,
dashboard, map and the report form. Every record carries four independent dimensions (origin,
review, publication, situation) that are never merged into one "verified" badge.

| #   | Decision                                                                                        | Why                                                                                  | ADR        |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------- |
| 1   | Scope: P0 + P1; importers and social drafts are ports with demo adapters                        | Sources must be access-tested before building importers; the brief says so           | —          |
| 2   | PostGIS on Neon for two queries only: radius around a point, notice ∩ district                  | The brief chose Neon for geographic queries; everything else is plain columns        | 0003 (new) |
| 3   | Events have immutable versions; decisions reference the version they reviewed                   | Required by "block a decision on a stale version" and the public change history      | 0004 (new) |
| 4   | Global roles via Better Auth `admin` plugin; organization membership in our own table           | Organizations are domain entities (coverage, needs); auth must not own them          | 0005 (new) |
| 5   | Use cases stay plain async functions with one `deps` object per module and typed `Result`       | Matches the template; Effect deferred until > 10 repositories or cancellation needed | 0006 (new) |
| 6   | Demo data: seed with `isDemo` flag and a fixed demo clock                                       | The design package demands visible "Demostración" labels everywhere                  | —          |
| 7   | Evidence files through an `IFileStorage` port (R2 adapter, signed upload URL)                   | The evidence model depends on it; the browser upload UI comes with the UI phase      | —          |
| 8   | Author's exact coordinates stored privately; public geometry follows declared precision         | Privacy rule from the design package                                                 | —          |
| 9   | Auth stays email + password; "Andes Alerta" is a display constant, scope stays `@emergency-map` | Already working; renaming is a separate decision                                     | —          |
| 10  | The design package supersedes `docs/product-brief.md`; its data invariants are kept             | More recent and more detailed; invariants are compatible                             | —          |

Contracts for the layered map (Community, SemaforoCell, Ingestor<T>) are in
[2026-10-18-domain-contracts.md](./2026-10-18-domain-contracts.md) and ADR 0008.

## Open questions

- District polygons: a public source with a clear license was not yet identified. Until then
  `territory.geometry` is nullable and notice ∩ district falls back to centroid-in-polygon.
- Which SENAMHI notice feed is stable enough for the file-based import of the demo.

## Out of scope

Real social publishing, notifications, payments, PR-time CI, staging, mobile, forecast UI.

## Failures this must protect against

1. A published report shown as corroborated because it was approved (publication ≠ review).
2. An expired notice presented as a resolved emergency (validity ≠ situation).
3. Five contributions counted as five verifications.
4. A decision applied to a version older than the current one without a conflict error.
5. A merged or withdrawn event still listed as a current event, or counted twice in clusters.
6. The author's exact coordinates leaking in a public read model or a shared link.
7. A demo record rendered without its `isDemo` flag.
8. A need past its deadline listed under "vigentes"; a collection point withdrawn still listed as operating.
9. "No reports" interpreted as "safe" by any API default or copy.
10. A report with only district precision given an exact distance in "Cerca de mí".

## Module contracts

The five implementation tracks run in parallel and meet on these names. Changing a name here
means changing it everywhere; prefer adding over renaming.

### Domain (`packages/domain`, written first, owned by the spec author)

Constants (`as const` arrays) in `src/constants/*`; Zod schemas in `src/schemas/*`; repository
interfaces and ports in `src/repositories/*`. See the files; they are the contract.

### Application (`packages/application/src/<module>/`)

Each use case: `async function name(deps: ModuleDeps, input, actor?) => Promise<Result<T, E>>`
with `E` a tagged union (`{ kind: "..." }`). `ModuleDeps` per module, built from the domain
interfaces plus `IClock` and `IIdGenerator`.

| Module      | Use cases                                                                                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events`    | `submitReport`, `findPossibleDuplicates`, `getEvent` (public read model, hides private coords), `listEvents` (filters + pagination), `listEventsInBounds`, `listActivity`, `shareSummary` |
| `evidence`  | `addEvidence`, `listEvidenceForEvent`, `requestUploadUrl`                                                                                                                                 |
| `review`    | `listReviewQueue`, `getReviewCase`, `decidePublication`, `decideCorroboration`, `decideRelation` (link/merge/split), `reportClosure`, `reportIssue`                                       |
| `territory` | `searchTerritories`, `getTerritory`, `getLocalityOverview` (notices ∩ district, events in district, needs covering it), `listNearby` (radius, approximate flag)                           |
| `help`      | `createOrganization`, `addOrganizationMember`, `createNeed`, `updateNeedStatus`, `listNeeds`, `createCollectionPoint`, `listCollectionPoints`, `getOrganizationProfile`                   |
| `sources`   | `listDataSources` (public status), `recordImportRun` (internal), `importOfficialNotices` through `IOfficialNoticeImporter`                                                                |

Authorization is a use-case concern: the actor (`{ userId, role, organizationIds }`) is checked
in the use case **and** the repository query is scoped (hub: security-hardening).

### Persistence (`packages/infra-db`)

- Drizzle schema per aggregate; every table through `createTable` (prefix `emergency_map_`).
- PostGIS: migration `0001_postgis` creates the extension; `events.location`,
  `collection_points.location`, `territories.centroid` are `geometry(Point, 4326)`;
  `official_notices.geometry` and `territories.geometry` are `geometry(MultiPolygon, 4326)` via
  `customType`. Only `ITerritoryRepository.findNearby` and `IOfficialNoticeRepository.findIntersectingTerritory`
  use `ST_*`.
- `createRepositories(db): Repositories` exported from `@emergency-map/infra-db/repositories`,
  returning every domain interface implemented.
- `pnpm run db:seed` loads the DEMO dataset (ids from the design package) and the ubigeo sample.

### API (`apps/server-hono`)

oRPC contracts under `src/contract/<module>.contract.ts`, routers under `src/modules/<module>/`,
mounted at `/api/v1`. Route groups: `events`, `evidence`, `review`, `territory`, `help`,
`sources`. Public reads need no session; writes need a session; review needs `moderator`;
organization writes need membership. Errors map `Result` failures to HTTP statuses in one place.

### Web (`apps/web-hono`)

Routes from the design package (`/`, `/mapa`, `/reportar`, `/auth/login`, `/auth/signup` for
this phase). Map via mapcn components copied into `src/components/ui/map`. Visual tokens from
the design package in `src/index.css`. Data through the oRPC client (`src/lib/orpc-client.ts`);
until a route exists, a typed fixture module `src/lib/fixtures/*` shaped by the domain schemas.

## Sources and unverified claims

- Design package (9 documents, owner's `workspace-temp/`, 2026-10-17). Not committed verbatim.
- `docs/product-brief.md` (2026-10-17): earlier framing, superseded in priority by this spec.
- Ushahidi separates post status from verification and runs posts through stages before
  publication: <https://docs.ushahidi.com/platform-user-manual/legacy/overview-of-ushahidi-platform-v3.0>.
- Drizzle + Neon on Workers: <https://orm.drizzle.team/docs/quick-postgresql/neon>,
  <https://blog.cloudflare.com/neon-postgres-database-from-workers/>. Polygon columns need
  `customType`; unverified until the spike in track 1 passes.
- Better Auth admin plugin: <https://better-auth.com/docs/beta/plugins/admin>.
- mapcn: <https://www.mapcn.dev/docs> (MapLibre, GeoJSON, clusters). Not yet exercised in this app.
