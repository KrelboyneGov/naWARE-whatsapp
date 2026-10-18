import { z } from "zod";
import { oc } from "@orpc/contract";
import { NEED_CATEGORIES } from "@emergency-map/domain/constants";
import {
  collectionPointSchema,
  createCollectionPointInputSchema,
  createNeedInputSchema,
  createOrganizationInputSchema,
  listCollectionPointsInputSchema,
  listNeedsInputSchema,
  needSchema,
  organizationSchema,
  updateNeedStatusInputSchema,
} from "@emergency-map/domain/schemas";
import { apiResponseSchema, csvArray, queryBoolean } from "./shared";

const listNeedsQuerySchema = listNeedsInputSchema.extend({
  categories: csvArray(z.enum(NEED_CATEGORIES)).optional(),
  onlyActive: queryBoolean.default(true),
});

/** Query string form of `near`: lat and lng as separate parameters. */
const listCollectionPointsQuerySchema = listCollectionPointsInputSchema
  .omit({ near: true })
  .extend({
    accepts: csvArray(z.enum(NEED_CATEGORIES)).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(1).max(100).optional(),
  });

export const collectionPointListItemSchema = z.object({
  point: collectionPointSchema,
  distanceKm: z.number().nullable(),
});

export const organizationProfileSchema = z.object({
  organization: organizationSchema,
  /** Active needs only. */
  needs: z.array(needSchema),
  collectionPoints: z.array(collectionPointSchema),
});

export const helpContract = {
  listNeeds: oc
    .route({ method: "GET", path: "/needs", tags: ["help"] })
    .input(listNeedsQuerySchema)
    .output(apiResponseSchema(z.array(needSchema))),

  createNeed: oc
    .route({
      method: "POST",
      path: "/organizations/{id}/needs",
      successStatus: 201,
      tags: ["help"],
    })
    .input(createNeedInputSchema.omit({ organizationId: true }).extend({ id: z.string() }))
    .output(apiResponseSchema(needSchema)),

  updateNeedStatus: oc
    .route({ method: "PATCH", path: "/needs/{id}/status", tags: ["help"] })
    .input(updateNeedStatusInputSchema.omit({ needId: true }).extend({ id: z.string() }))
    .output(apiResponseSchema(needSchema)),

  listCollectionPoints: oc
    .route({ method: "GET", path: "/collection-points", tags: ["help"] })
    .input(listCollectionPointsQuerySchema)
    .output(apiResponseSchema(z.array(collectionPointListItemSchema))),

  createCollectionPoint: oc
    .route({
      method: "POST",
      path: "/organizations/{id}/collection-points",
      successStatus: 201,
      tags: ["help"],
    })
    .input(
      createCollectionPointInputSchema.omit({ organizationId: true }).extend({ id: z.string() }),
    )
    .output(apiResponseSchema(collectionPointSchema)),

  getOrganization: oc
    .route({ method: "GET", path: "/organizations/{id}", tags: ["help"] })
    .input(z.object({ id: z.string() }))
    .output(apiResponseSchema(organizationProfileSchema)),

  createOrganization: oc
    .route({ method: "POST", path: "/organizations", successStatus: 201, tags: ["help"] })
    .input(createOrganizationInputSchema)
    .output(apiResponseSchema(organizationSchema)),
};
