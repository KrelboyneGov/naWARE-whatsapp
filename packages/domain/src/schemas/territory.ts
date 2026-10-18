import { z } from "zod";
import { NEARBY_RADII_KM } from "../constants";
import { areaGeometrySchema, geoPointSchema, territoryRefSchema } from "./common";
import { publicEventSchema } from "./event";
import { collectionPointSchema, needSchema, organizationSchema } from "./help";
import { officialNoticeSchema } from "./source";

export const territorySchema = territoryRefSchema.extend({
  level: z.enum(["department", "province", "district"]),
  parentUbigeo: z.string().nullable(),
  centroid: geoPointSchema,
  /** Nullable until a licensed boundary source is loaded (spec open question). */
  geometry: areaGeometrySchema.nullable(),
});
export type Territory = z.infer<typeof territorySchema>;

export const searchTerritoriesInputSchema = z.object({
  query: z.string().trim().min(2).max(80),
  level: z.enum(["department", "province", "district"]).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
export type SearchTerritoriesInput = z.infer<typeof searchTerritoriesInputSchema>;

export const localityOverviewSchema = z.object({
  territory: territorySchema,
  /** Notices whose area includes all or part of the district. */
  notices: z.array(officialNoticeSchema.extend({ partialOverlap: z.boolean() })),
  events: z.array(publicEventSchema),
  /** Events in neighbouring districts, never mixed with the ones inside. */
  nearbyEvents: z.array(publicEventSchema),
  /** Organizations covering the district (coverage, not necessarily a seat there). */
  organizations: z.array(organizationSchema),
  needs: z.array(needSchema),
  /** True when no connected source returned data; never "safe". */
  noInformation: z.boolean(),
});
export type LocalityOverview = z.infer<typeof localityOverviewSchema>;

export const nearbyInputSchema = z.object({
  center: geoPointSchema,
  centerSource: z.enum(["gps", "manual"]),
  radiusKm: z.union(NEARBY_RADII_KM.map((r) => z.literal(r)) as never),
  kind: z.enum(["events", "road_incidents", "help"]),
});
export type NearbyInput = z.infer<typeof nearbyInputSchema>;

export const nearbyItemSchema = z.object({
  kind: z.enum(["event", "collection_point"]),
  event: publicEventSchema.nullable(),
  collectionPoint: collectionPointSchema.nullable(),
  /** Straight-line km; null when only district precision is known (then territorialMatch). */
  approxDistanceKm: z.number().nullable(),
  territorialMatch: z.boolean(),
});
export type NearbyItem = z.infer<typeof nearbyItemSchema>;
