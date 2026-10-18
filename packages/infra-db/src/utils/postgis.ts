import { customType } from "drizzle-orm/pg-core";
import { sql, type AnyColumn, type SQL } from "drizzle-orm";
import type { AreaGeometry, GeoPoint } from "@emergency-map/domain/schemas";

/** SRID used for every geometry column (WGS84 lon/lat). */
export const SRID = 4326;

/** SQL that builds a PostGIS point from a domain GeoPoint (longitude first). */
export const pointSql = (p: GeoPoint): SQL =>
  sql`ST_SetSRID(ST_MakePoint(${p.lng}::float8, ${p.lat}::float8), ${SRID})`;

/** SQL that builds a MultiPolygon from a GeoJSON Polygon or MultiPolygon. */
export const multiPolygonSql = (g: AreaGeometry): SQL =>
  sql`ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(g)}::text), ${SRID}))`;

const unreadable = (): never => {
  throw new Error(
    "Geometry columns must be selected with geoJson(column) (ST_AsGeoJSON); raw EWKB is not parsed.",
  );
};

const parseJsonOrFail = <T>(value: unknown): T =>
  typeof value === "string" && value.startsWith("{") ? (JSON.parse(value) as T) : unreadable();

/** geometry(Point, 4326). Write: ST_MakePoint. Read: select with `geoJson(column)`. */
export const geometryPoint = customType<{ data: GeoPoint; driverData: string }>({
  dataType: () => `geometry(Point,${SRID})`,
  toDriver: (value) => pointSql(value) as unknown as string,
  fromDriver: (value) => {
    const gj = parseJsonOrFail<{ coordinates: [number, number] }>(value);
    return { lng: gj.coordinates[0], lat: gj.coordinates[1] };
  },
});

/** geometry(MultiPolygon, 4326). A Polygon input is promoted with ST_Multi. */
export const geometryMultiPolygon = customType<{ data: AreaGeometry; driverData: string }>({
  dataType: () => `geometry(MultiPolygon,${SRID})`,
  toDriver: (value) => multiPolygonSql(value) as unknown as string,
  fromDriver: (value) => parseJsonOrFail<AreaGeometry>(value),
});

/** Selects a geometry column as a GeoJSON string; parse with `parsePoint` / `parseArea`. */
export const geoJson = (column: AnyColumn): SQL<string | null> =>
  sql<string | null>`ST_AsGeoJSON(${column})`;

export function parsePoint(json: string | null): GeoPoint | null {
  if (!json) return null;
  const gj = JSON.parse(json) as { coordinates: [number, number] };
  return { lng: gj.coordinates[0], lat: gj.coordinates[1] };
}

export function parseArea(json: string | null): AreaGeometry | null {
  if (!json) return null;
  const gj = JSON.parse(json) as AreaGeometry;
  return { type: gj.type, coordinates: gj.coordinates };
}

/** Distance in km between two geometries, measured on the sphere (geography cast). */
export const distanceKm = (a: SQL | AnyColumn, b: SQL | AnyColumn): SQL<number> =>
  sql<number>`(ST_Distance(${a}::geography, ${b}::geography) / 1000.0)`;
