# ADR 0009: Community signals move what neighbours say, never the review status

- Status: accepted in the repository (owner, 2026-10-17)
- Date: 2026-10-17

## Context

The owner wants Waze-style reporting. Reporting takes two taps (what, then send). Other people
answer "¿Sigue ahí?" with "sigue ahí", "está peor" or "ya no está". Waze lets these answers
shorten or remove a report. Two existing rules rule that out. Spec failure 3 says five
contributions are not five verifications. The `SITUATION_STATUSES` comment says a situation is
never derived from elapsed time alone.

The owner also asked that people without an account can report. Their reports stay unverified,
and an anonymous report is shown only once three different anonymous people report the same
thing nearby.

## Decision

- An `EventSignal` is one person's current answer about one event. The latest answer per
  `reporterKey` wins, so changing your mind replaces your answer.
- `summarizeSignals` turns recent signals (the last `SIGNAL_WINDOW_HOURS`) into a
  `CommunityState`. The states are confirmed by neighbours, getting worse, possibly resolved,
  mixed, or no recent signals. The UI shows that state as its own badge, next to the review
  badge and separate from it.
- Signals never change `reviewStatus`, never hide an event and never close it. "Possibly
  resolved" needs at least three people saying "ya no está" who outnumber the rest. The event
  stays listed, dimmed, and a moderator can record the closure.
- A quick report carries a `hazardType` in the user's words (huaico, aniego…). Each hazard type
  maps to exactly one `EVENT_CATEGORIES` value, so filters, layers and notices keep working on
  the category.
- A signed-in quick report is public at once and unverified. An anonymous quick report becomes
  public only when `ANONYMOUS_MIN_REPORTERS` (3) distinct anonymous people report the same
  hazard type within `ANONYMOUS_CLUSTER_RADIUS_KM` and `ANONYMOUS_CLUSTER_HOURS`.

The rules live in `@emergency-map/domain/rules` and are pure functions. Whoever builds the
backend calls the same functions, so the web and the API cannot disagree.

## Alternatives rejected

- **Waze expiry (TTL plus "not there" removes the report):** contradicts spec failure 3 and the
  situation rule. It also lets three accounts erase a real hazard.
- **Counting signals as corroboration:** this is exactly failure 3.
- **Points and reputation:** not needed for the hackathon. Reopen if abuse appears.

## Consequences

- The map can look busier than Waze, because resolved items fade instead of disappearing.
- The API needs signal and quick-report storage plus endpoints. Until then the web reads the
  demo dataset plus what the browser stored, through `apps/web-hono/src/lib/community-source.ts`.
- The thresholds are constants. Tuning them needs no schema change.

## Non-goals

Fraud detection, device fingerprinting, and ranking reporters.

## Reopen when

Real usage shows that resolved hazards clutter the map, or that the anonymous threshold is
being gamed.
