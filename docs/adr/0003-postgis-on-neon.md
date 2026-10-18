# ADR 0003: PostGIS on Neon for radius and intersection queries

- Status: accepted · Date: 2026-10-17 · Refs #1

## Context

The product answers two geographic questions: "what is within N km of this point" (Cerca de mí,
duplicate detection) and "which official notices intersect this district" (Mi localidad). The
original brief chose Neon with PostGIS for exactly these. Drizzle has a native `geometry` type for
points; polygons need a `customType` and raw `ST_*` SQL.

## Decision

Enable PostGIS on the Neon database. Store points as `geometry(Point, 4326)` and polygons as
`geometry(MultiPolygon, 4326)`. Use PostGIS only in two repository methods
(`findNearby`, `findIntersectingTerritory`); every other query uses ordinary columns. Public read
models expose GeoJSON, never WKB.

## Alternatives rejected

- Plain lat/lng with haversine in SQL and intersections computed in the app with turf: no
  extension, but intersection over 1,874 districts becomes application code and a known
  performance trap.
- Geometry as `jsonb` only: no spatial index, no intersection in the database.

## Consequences

- Migration `0001` runs `CREATE EXTENSION IF NOT EXISTS postgis`; the Neon role must allow it
  (Neon does by default).
- Two queries are raw SQL and need their own tests against a Neon branch (`pr-integration.yml`).
- District polygons are nullable until a licensed source is found; intersection degrades to
  centroid-in-polygon.

## Non-goals

Routing, isochrones, raster layers, tile serving.

## Reopen when

A third spatial query appears, or the Neon HTTP driver cannot return geometries reliably in the
spike.
