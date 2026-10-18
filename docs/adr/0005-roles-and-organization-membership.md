# ADR 0005: Better Auth admin roles; organization membership in the domain

- Status: accepted · Date: 2026-10-17 · Refs #1

## Context

Roles: visitor (no account), user, moderator, administrator; plus organization members who edit
their own needs and collection points. Better Auth offers an `admin` plugin (global role on the
user) and an `organization` plugin (members and teams).

## Decision

Use the `admin` plugin for the global role (`user` | `moderator` | `admin`). Keep organizations
as domain entities in our tables, with `organization_members (organization_id, user_id, role)`.
Authorization is checked in the use case from an `Actor` and enforced again in the repository
query (owner or organization scoped `WHERE`).

## Alternatives rejected

- Better Auth `organization` plugin: couples a domain aggregate (coverage, needs, points) to the
  auth library's table shape and lifecycle.
- Roles in our own `users` extension only: duplicates what the admin plugin already stores.

## Consequences

- Moderator and admin are assigned through the admin plugin API or the seed.
- A role selector in the UI is a demo affordance, never a permission source.

## Reopen when

Organizations need invitations, SSO or teams, which the plugin already implements.
