import { z } from "zod";
import { oc } from "@orpc/contract";
import {
  EVENT_CATEGORIES,
  ORIGINS,
  REVIEW_STATUSES,
  SITUATION_STATUSES,
} from "@emergency-map/domain/constants";
import {
  activityEntrySchema,
  boundsSchema,
  duplicateCandidateSchema,
  eventFiltersSchema,
  findDuplicatesInputSchema,
  listPageSchema,
  publicEventSchema,
  publicEvidenceSchema,
  publicReviewDecisionSchema,
  submitReportInputSchema,
} from "@emergency-map/domain/schemas";
import {
  apiResponseSchema,
  csvArray,
  csvNumbers,
  paginatedApiResponseSchema,
  queryBoolean,
} from "./shared";

/** Event filters as they arrive in a query string. */
const eventFiltersQuerySchema = eventFiltersSchema.extend({
  categories: csvArray(z.enum(EVENT_CATEGORIES)).optional(),
  origins: csvArray(z.enum(ORIGINS)).optional(),
  reviewStatuses: csvArray(z.enum(REVIEW_STATUSES)).optional(),
  situationStatuses: csvArray(z.enum(SITUATION_STATUSES)).optional(),
  bounds: csvNumbers(boundsSchema).optional(),
  withNeeds: queryBoolean.optional(),
  includeDemo: queryBoolean.default(true),
});

const listEventsQuerySchema = eventFiltersQuerySchema
  .extend(listPageSchema.shape)
  .extend({ sort: z.enum(["last_updated", "occurred"]).default("last_updated") });

const listActivityQuerySchema = eventFiltersQuerySchema.extend(listPageSchema.shape);

/** What a shared link may show. Carries no location at all. */
export const shareSummarySchema = z.object({
  title: z.string(),
  date: z.date(),
  reviewLabel: z.string(),
  publicationLabel: z.string(),
  urlPath: z.string(),
  isDemo: z.boolean(),
});

export const eventDetailSchema = z.object({
  event: publicEventSchema,
  evidence: z.array(publicEvidenceSchema),
  decisions: z.array(publicReviewDecisionSchema),
  /** Set on a merged event so the client can redirect to the main one. */
  mergedIntoEventId: z.string().nullable(),
});

export const eventsContract = {
  list: oc
    .route({ method: "GET", path: "/events", tags: ["events"] })
    .input(listEventsQuerySchema)
    .output(paginatedApiResponseSchema(z.array(publicEventSchema))),

  get: oc
    .route({ method: "GET", path: "/events/{id}", tags: ["events"] })
    .input(z.object({ id: z.string() }))
    .output(apiResponseSchema(eventDetailSchema)),

  submit: oc
    .route({ method: "POST", path: "/events", successStatus: 201, tags: ["events"] })
    .input(submitReportInputSchema)
    .output(apiResponseSchema(publicEventSchema)),

  findDuplicates: oc
    .route({ method: "POST", path: "/events/duplicates", tags: ["events"] })
    .input(findDuplicatesInputSchema)
    .output(apiResponseSchema(z.array(duplicateCandidateSchema))),

  activity: oc
    .route({ method: "GET", path: "/activity", tags: ["events"] })
    .input(listActivityQuerySchema)
    .output(paginatedApiResponseSchema(z.array(activityEntrySchema))),

  share: oc
    .route({ method: "GET", path: "/events/{id}/share", tags: ["events"] })
    .input(z.object({ id: z.string() }))
    .output(apiResponseSchema(shareSummarySchema)),
};
