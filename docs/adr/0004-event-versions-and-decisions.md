# ADR 0004: Immutable event versions; decisions reference the reviewed version

- Status: accepted · Date: 2026-10-17 · Refs #1

## Context

The design package requires: a public "what changed" history, decisions with actor, date and
reason, and a conflict when a moderator decides on a version that is no longer current. It also
separates four dimensions (origin, review, publication, situation) that must never collapse.

## Decision

- `events` holds identity and the current dimension values; `event_versions` holds immutable
  snapshots of the editable content (title, description, category, location, time) with a
  sequence number; `events.current_version` points at the latest.
- `review_decisions` reference `(event_id, version_seq)`; a decision whose `version_seq` is not
  the current one fails with `stale_version`.
- Evidence and official notices link to the event, not to a version.
- Merges keep both rows: the merged event gets `publication_status = "merged"` and
  `merged_into_event_id`; its evidence stays attached and is listed under the main event.
- Severity is optional and always carries `severity_source`.

## Alternatives rejected

- One mutable row plus an audit log: simpler to write, but conflicts and history become
  reconstructions.
- Event sourcing with projections: more than the product needs now.

## Consequences

- Reads join `events` with the current version; the repository hides that.
- Editing a published report creates a new version in `pending_review` without touching the
  published one.

## Non-goals

Branching versions, undo.

## Reopen when

Versions need per-field provenance, or history reads dominate and need a projection.
