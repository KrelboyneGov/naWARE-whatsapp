import { z } from "zod";
import { oc } from "@orpc/contract";
import { PUBLICATION_STATUSES, QUEUE_REASONS } from "@emergency-map/domain/constants";
import {
  decideCorroborationInputSchema,
  decidePublicationInputSchema,
  decideRelationInputSchema,
  eventVersionSchema,
  issueReportSchema,
  publicEventSchema,
  publicEvidenceSchema,
  reportClosureInputSchema,
  reportIssueInputSchema,
  reviewDecisionSchema,
  reviewQueueFiltersSchema,
  reviewQueueItemSchema,
} from "@emergency-map/domain/schemas";
import { apiResponseSchema, csvArray, paginatedApiResponseSchema, queryBoolean } from "./shared";

const reviewQueueQuerySchema = reviewQueueFiltersSchema.extend({
  reasons: csvArray(z.enum(QUEUE_REASONS)).optional(),
  publicationStatuses: csvArray(z.enum(PUBLICATION_STATUSES)).optional(),
  assignedToMe: queryBoolean.optional(),
});

/** Moderator view: all evidence and full decisions (with private notes), never author ids. */
export const reviewCaseSchema = z.object({
  event: publicEventSchema,
  versions: z.array(eventVersionSchema),
  evidence: z.array(publicEvidenceSchema),
  decisions: z.array(reviewDecisionSchema),
});

export const reviewContract = {
  queue: oc
    .route({ method: "GET", path: "/review/queue", tags: ["review"] })
    .input(reviewQueueQuerySchema)
    .output(paginatedApiResponseSchema(z.array(reviewQueueItemSchema))),

  case: oc
    .route({ method: "GET", path: "/review/{eventId}", tags: ["review"] })
    .input(z.object({ eventId: z.string() }))
    .output(apiResponseSchema(reviewCaseSchema)),

  decidePublication: oc
    .route({ method: "POST", path: "/review/{eventId}/publication", tags: ["review"] })
    .input(decidePublicationInputSchema)
    .output(apiResponseSchema(reviewDecisionSchema)),

  decideCorroboration: oc
    .route({ method: "POST", path: "/review/{eventId}/corroboration", tags: ["review"] })
    .input(decideCorroborationInputSchema)
    .output(apiResponseSchema(reviewDecisionSchema)),

  decideRelation: oc
    .route({ method: "POST", path: "/review/{eventId}/relation", tags: ["review"] })
    .input(decideRelationInputSchema)
    .output(apiResponseSchema(reviewDecisionSchema)),

  reportClosure: oc
    .route({ method: "POST", path: "/review/{eventId}/closure", tags: ["review"] })
    .input(reportClosureInputSchema)
    .output(apiResponseSchema(reviewDecisionSchema)),

  reportIssue: oc
    .route({
      method: "POST",
      path: "/events/{eventId}/issues",
      successStatus: 201,
      tags: ["review"],
    })
    .input(reportIssueInputSchema)
    .output(apiResponseSchema(issueReportSchema.omit({ reporterId: true }))),
};
