# ADR 0006: Use cases stay plain async functions with a deps object

- Status: accepted · Date: 2026-10-17 · Refs #1

## Context

The template ships use cases as async functions taking a repository parameter. The hub's ADR on
Effect recommends Effect for use cases but warns that half-adoption costs more than it returns,
and this phase runs in hackathon time with contributors who may not know Effect.

## Decision

Use cases are `async (deps, input, actor?) => Promise<Result<T, E>>` with one `ModuleDeps`
object per module (repositories, `IClock`, `IIdGenerator`, ports) and `E` a tagged union of
domain errors. Consumers map `Result` failures to their transport in one bridge.

## Alternatives rejected

- Effect now: typed errors and DI in the type, at a learning cost the team cannot pay this week.
- Positional repository parameters (template default): degrades past a few repositories.

## Consequences

- Migrating to Effect later is mechanical: `ModuleDeps` becomes a `Layer`, tagged unions become
  `Data.TaggedError`.

## Non-goals

Interruption, retries, resource scopes.

## Reopen when

More than ten repositories, or cancellation of in-flight work is required.
