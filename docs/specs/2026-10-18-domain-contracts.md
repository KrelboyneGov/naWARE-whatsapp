# Domain contracts — layered map

Refs #1 · Team ticket: "Definir esquemas zod y tipos" · Decision: [ADR 0008](../adr/0008-layered-map-no-aggregate-score.md)

## Summary (one minute)

The product is a map of Peru where every source is its own **layer**, each with its own level,
legend and dates. Nothing is merged into one color: a landslide and a weak earthquake in the
same district are two independent cells. All contracts are Zod schemas in
`packages/domain` (import from `@emergency-map/domain/schemas`, `/constants`,
`/repositories`); fixtures are in `@emergency-map/domain/demo` and a test keeps them valid.

| #   | Decision                                           | Why                                                             | ADR        |
| --- | -------------------------------------------------- | --------------------------------------------------------------- | ---------- |
| 1   | One layer per source, no aggregate score           | Different scales cannot be combined honestly                    | 0008 (new) |
| 2   | Ticket names map to existing contracts; no renames | API and UI already run in production on these names             | —          |
| 3   | `SemaforoCell` = one layer in one district         | Keeps the ticket's name with the layered meaning                | 0008       |
| 4   | `Community` = a group to join, never a population  | Resolves the ambiguity noted in `KNOWLEDGE.base/00-contexto.md` | —          |
| 5   | Generic `Ingestor<T>`, one per source              | A broken source only affects its own layer                      | 0008       |

## Open questions

- Matrix D-03/D-04 still say "semáforo de lluvias"; the team must approve the v0.3 proposal.
- Which layers the MVP actually fills (pilot district and sources are still pending, D-04/D-06).
- Earthquake and tsunami categories: not in `EVENT_CATEGORIES` yet (the brief deferred them).

## Out of scope

Implementing ingestors, computing cells, storing communities, UI for layers. This document
only fixes the contracts the ingestors, API and UI build on.

## Failures this must protect against

1. A district shown as one color that mixes sources.
2. "No information" or a failed source rendered as safe.
3. A forecast or historical exposure presented as a current incident.
4. A source's level re-graded by the product.
5. Our fetch time presented as the source's publication time.
6. A broken source blocking other layers.

## Ticket name → contract

| Ticket         | Contract                                                                    | File                                         | Notes                                                    |
| -------------- | --------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `Incident`     | `Event` (citizen reports, versioned) and `OfficialNotice` (issued warnings) | `schemas/event.ts`, `schemas/source.ts`      | An official notice is not an event that happened         |
| `Report`       | `SubmitReportInput` (new report), `Evidence` (contribution to an event)     | `schemas/event.ts`, `schemas/evidence.ts`    | Contributions never auto-corroborate (ADR 0004)          |
| `Benefactor`   | `Organization`, `CollectionPoint`, `Need`                                   | `schemas/help.ts`                            | A seat is not a collection point; destination ≠ location |
| `Community`    | `Community` (new)                                                           | `schemas/community.ts`                       | Group to join; coverage is a list of districts           |
| `SemaforoCell` | `SemaforoCell` and `DistrictLayers` (new)                                   | `schemas/layer.ts`                           | One layer, one district; no aggregate                    |
| `IngestRun`    | `ImportRun`                                                                 | `schemas/source.ts`                          | Status, processed, duplicates avoided, error summary     |
| `Ingestor<T>`  | `Ingestor<T>` (new), `IngestBatch<T>`, `IngestItem<T>`                      | `repositories/ports.ts`, `schemas/ingest.ts` | Existing `IOfficialNoticeImporter` predates it           |

The four review dimensions on events (origin, review, publication, situation) are unchanged:
see `constants/event.ts` and ADR 0004.

## Layers

`LAYERS` in `constants/layer.ts`: `official_notices`, `official_emergencies`,
`citizen_reports`, `road_status`, `forecast`, `historical_exposure`, `help_points`,
`communities`. `HAZARD_LAYERS` is the subset that describes hazards.

## SemaforoCell

| Field                             | Meaning                                                           |
| --------------------------------- | ----------------------------------------------------------------- |
| `territory`, `layer`, `sourceId`  | Which district, which layer, which source                         |
| `status`                          | `has_data`, `no_information` (never "safe"), `source_unavailable` |
| `level`, `legend`                 | The source's own level and legend, verbatim                       |
| `colorToken`                      | UI color resolved from that legend; null without data             |
| `recordIds`                       | Notices, events or points behind the cell                         |
| `sourcePublishedAt` / `fetchedAt` | Source publication time vs our last successful fetch              |
| `validFrom` / `validTo`           | Validity of the newest record, when declared                      |

## Implementing an ingestor

```ts
import type { Ingestor } from "@emergency-map/domain/repositories";

export const senamhiNotices: Ingestor<NoticePayload> = {
  sourceId: "SRC-SENAMHI-AVISOS",
  layer: "official_notices",
  payloadSchema: noticePayloadSchema,
  async fetch({ since, signal }) {
    // call the source, normalize each record into NoticePayload,
    // put unparseable rows in `rejected` with a reason, never throw away silently
    return { sourceId: this.sourceId, layer: this.layer, items, rejected, rawRef, fetchedAt };
  },
};
```

The use case stores items by `(sourceId, externalId)`, records an `ImportRun`, and on failure
keeps the previous records with their age visible.

## Fixtures

`@emergency-map/domain/demo`: `DEMO_EVENTS`, `DEMO_PENDING_EVENTS`, `DEMO_NOTICES`,
`DEMO_SOURCES`, `DEMO_TERRITORIES`, `DEMO_ORGANIZATIONS`, `DEMO_COLLECTION_POINTS`,
`DEMO_NEEDS`, `DEMO_COMMUNITIES`, `DEMO_DISTRICT_LAYERS`, `DEMO_INGEST_BATCH`,
`DEMO_INGEST_RUNS`. `src/demo/__tests__/fixtures.test.ts` parses every fixture with its schema.

## Changing a contract

Contracts block ingestors, API and UI. Change them in a PR that touches this document, and
announce the change to the team (ticket criterion).
