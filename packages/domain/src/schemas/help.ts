import { z } from "zod";
import {
  COLLECTION_POINT_STATUSES,
  NEED_CATEGORIES,
  NEED_STATUSES,
  ORGANIZATION_REVIEW_STATUSES,
} from "../constants";
import { geoPointSchema, territoryRefSchema } from "./common";

/** Contact shown publicly. Demo contacts are flagged and non-operational. */
export const publicContactSchema = z.object({
  kind: z.enum(["email", "phone", "website", "social"]),
  value: z.string(),
  isDemo: z.boolean(),
});
export type PublicContact = z.infer<typeof publicContactSchema>;

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(160),
  description: z.string().max(1000),
  coverage: z.array(territoryRefSchema),
  contacts: z.array(publicContactSchema),
  identityReview: z.enum(ORGANIZATION_REVIEW_STATUSES),
  identityReviewedAt: z.date().nullable(),
  contactReview: z.enum(ORGANIZATION_REVIEW_STATUSES),
  contactReviewedAt: z.date().nullable(),
  isDemo: z.boolean(),
  createdAt: z.date(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const createOrganizationInputSchema = organizationSchema.pick({
  name: true,
  description: true,
  coverage: true,
  contacts: true,
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;

/** Declared weekly schedule; never rendered as "abierto ahora". */
export const declaredScheduleSchema = z.object({
  text: z.string().max(300),
  confirmedAt: z.date().nullable(),
});

export const collectionPointSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().min(1).max(160),
  address: z.string().max(300),
  arrivalReference: z.string().max(300).nullable(),
  location: geoPointSchema,
  territory: territoryRefSchema,
  schedule: declaredScheduleSchema,
  accepts: z.array(z.enum(NEED_CATEGORIES)),
  doesNotAccept: z.string().max(300).nullable(),
  /** Region the donations go to; may differ from where the point is. */
  destinationTerritories: z.array(territoryRefSchema),
  contacts: z.array(publicContactSchema),
  status: z.enum(COLLECTION_POINT_STATUSES),
  availabilityConfirmedAt: z.date().nullable(),
  isDemo: z.boolean(),
  updatedAt: z.date(),
});
export type CollectionPoint = z.infer<typeof collectionPointSchema>;

export const createCollectionPointInputSchema = collectionPointSchema.omit({
  id: true,
  status: true,
  isDemo: true,
  updatedAt: true,
});
export type CreateCollectionPointInput = z.infer<typeof createCollectionPointInputSchema>;

export const needSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  eventId: z.string().nullable(),
  title: z.string().min(1).max(160),
  description: z.string().max(1000),
  category: z.enum(NEED_CATEGORIES),
  destinationTerritory: territoryRefSchema,
  collectionPointId: z.string().nullable(),
  /** Only if declared by the organization. */
  quantity: z.string().max(100).nullable(),
  deadline: z.date().nullable(),
  status: z.enum(NEED_STATUSES),
  statusNote: z.string().max(300).nullable(),
  isDemo: z.boolean(),
  updatedAt: z.date(),
});
export type Need = z.infer<typeof needSchema>;

export const createNeedInputSchema = needSchema.omit({
  id: true,
  status: true,
  statusNote: true,
  isDemo: true,
  updatedAt: true,
});
export type CreateNeedInput = z.infer<typeof createNeedInputSchema>;

export const updateNeedStatusInputSchema = z.object({
  needId: z.string(),
  status: z.enum(NEED_STATUSES),
  note: z.string().trim().min(1).max(300),
});
export type UpdateNeedStatusInput = z.infer<typeof updateNeedStatusInputSchema>;

export const listNeedsInputSchema = z.object({
  ubigeo: z.string().optional(),
  categories: z.array(z.enum(NEED_CATEGORIES)).optional(),
  /** Default true: expired and covered needs are excluded. */
  onlyActive: z.boolean().default(true),
  organizationId: z.string().optional(),
  eventId: z.string().optional(),
});
export type ListNeedsInput = z.infer<typeof listNeedsInputSchema>;

export const listCollectionPointsInputSchema = z.object({
  ubigeo: z.string().optional(),
  accepts: z.array(z.enum(NEED_CATEGORIES)).optional(),
  near: geoPointSchema.optional(),
  radiusKm: z.number().min(1).max(100).optional(),
  organizationId: z.string().optional(),
});
export type ListCollectionPointsInput = z.infer<typeof listCollectionPointsInputSchema>;
