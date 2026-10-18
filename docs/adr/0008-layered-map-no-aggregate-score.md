# ADR 0008: One layer per source; no cross-source aggregate score

- Status: accepted in the repository · pending the matching update of matrix D-03 in Linear
  (`KNOWLEDGE.base/proposals/2026-10-18-matriz-v0.3-mapa-por-capas.md`)
- Date: 2026-10-18 · Refs #1

## Context

Matrix v0.2 (D-03) describes the product as "Cerca: semáforo de lluvias", one color per
district. The repository was built on the opposite rule: each source keeps its own level. The
team ticket for contracts asks for a `SemaforoCell`.

A single color per district mixes facts that do not share a scale. Example: a landslide with a
high level and an earthquake with a low magnitude in the same district. Averaged or
"worst-of" into one color, the low earthquake either dilutes the landslide or the landslide
hides that the earthquake is minor. A forecast, a past exposure and an incident that already
happened would also collapse into the same color. The owner decided on 2026-10-18 to show
every source as its own layer instead.

## Decision

- The map is a set of **layers**, one per kind of information (`LAYERS`): official notices,
  official emergencies, citizen reports, road status, forecast, historical exposure, help
  points and communities. Each source feeds one layer.
- `SemaforoCell` is the state of **one layer in one district**: the source's own level and
  legend, its records, publication and fetch times, validity, and a status
  (`has_data`, `no_information`, `source_unavailable`).
- `DistrictLayers` lists a district's cells side by side and **has no aggregate field**. A test
  in `packages/domain` fails if one is added.
- "No information" and "source unavailable" are never rendered as safe or green.
- Sources are integrated through `Ingestor<T>`, one per source, so a broken source affects only
  its layer.

## Alternatives rejected

- **One color per district (semáforo v0.2):** mixes incomparable scales and hides sources, as
  the example above shows.
- **Worst-of across layers:** avoids dilution but still hides which source raised the alarm and
  treats a forecast like an observed incident.
- **A product priority score next to the layers:** possible later as a separate, explained
  field; not needed for the MVP and easy to misread as official.

## Consequences

- The UI shows layer toggles and, per district, a list of cells with their legends.
- The matrix in Linear must be updated (D-03, D-04) by the team; until then this ADR and the
  matrix disagree and the proposal records it.
- Alerts (D-10) trigger per layer and per source, not on a combined color.

## Non-goals

Computing risk, predicting impact, or ranking districts.

## Reopen when

The team needs a single prioritization signal (e.g. for alerts) and defines how to compute and
explain it without replacing the source levels.
