import { z } from "zod";
import { LOCATION_PRECISIONS, TIME_PRECISIONS, USER_ROLES } from "../constants";

/** WGS84 point. Longitude first in GeoJSON; named fields here to avoid order mistakes. */
export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

/** Map viewport rectangle [west, south, east, north]. */
export const boundsSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export type Bounds = z.infer<typeof boundsSchema>;

/** GeoJSON MultiPolygon or Polygon geometry as exposed on the wire. */
export const areaGeometrySchema = z.object({
  type: z.enum(["Polygon", "MultiPolygon"]),
  coordinates: z.array(z.any()),
});
export type AreaGeometry = z.infer<typeof areaGeometrySchema>;

/** Reference to a territorial unit by INEI ubigeo (6 digits district, 4 province, 2 department). */
export const territoryRefSchema = z.object({
  ubigeo: z.string().regex(/^\d{2}(\d{2}(\d{2})?)?$/),
  name: z.string(),
  provinceName: z.string().nullable(),
  departmentName: z.string(),
});
export type TerritoryRef = z.infer<typeof territoryRefSchema>;

/** Where something happened, with explicit precision. */
export const placeSchema = z.object({
  precision: z.enum(LOCATION_PRECISIONS),
  /** Public point; null when precision is "district" (never invent a point). */
  point: geoPointSchema.nullable(),
  territory: territoryRefSchema,
  /** Free-text reference shown publicly, e.g. "ladera norte". */
  reference: z.string().max(200).nullable(),
});
export type Place = z.infer<typeof placeSchema>;

/** When something happened, with explicit precision. */
export const occurredAtSchema = z.object({
  precision: z.enum(TIME_PRECISIONS),
  start: z.coerce.date(),
  /** Only for precision "interval". */
  end: z.coerce.date().nullable(),
});
export type OccurredAt = z.infer<typeof occurredAtSchema>;

/** Who performs an action. Built by the API from the session; never from client input. */
export const actorSchema = z.object({
  userId: z.string(),
  role: z.enum(USER_ROLES),
  organizationIds: z.array(z.string()),
  publicName: z.string(),
});
export type Actor = z.infer<typeof actorSchema>;

/** Public author shown on reports and evidence. Never contact data. */
export const publicAuthorSchema = z.object({
  displayName: z.string(),
  role: z.enum(["citizen", "organization", "moderator", "official"]),
});
export type PublicAuthor = z.infer<typeof publicAuthorSchema>;

export const listPageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListPage = z.infer<typeof listPageSchema>;
