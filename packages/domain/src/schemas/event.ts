import { z } from "zod";
import {
  ACTIVITY_TYPES,
  EVENT_CATEGORIES,
  ORIGINS,
  PUBLICATION_STATUSES,
  REPORT_DESCRIPTION_MAX,
  REPORT_TITLE_MAX,
  REVIEW_STATUSES,
  SITUATION_STATUSES,
} from "../constants";
import {
  boundsSchema,
  geoPointSchema,
  listPageSchema,
  occurredAtSchema,
  placeSchema,
  publicAuthorSchema,
} from "./common";

/** Severity always travels with the issuer that published it and its own legend. */
export const severitySchema = z.object({
  level: z.string(),
  issuer: z.string(),
  legend: z.string(),
});
export type Severity = z.infer<typeof severitySchema>;

/** Immutable snapshot of the editable content of an event (ADR 0004). */
export const eventVersionSchema = z.object({
  eventId: z.string(),
  seq: z.number().int().min(1),
  category: z.enum(EVENT_CATEGORIES),
  title: z.string().min(1).max(REPORT_TITLE_MAX),
  description: z.string().max(REPORT_DESCRIPTION_MAX),
  place: placeSchema,
  occurredAt: occurredAtSchema,
  createdBy: z.string(),
  createdAt: z.date(),
  /** "pending_review" for an edit of a published event until a moderator publishes it. */
  publicationStatus: z.enum(PUBLICATION_STATUSES),
});
export type EventVersion = z.infer<typeof eventVersionSchema>;

/** Full internal event. Contains the author's private coordinates; never sent to the public. */
export const eventSchema = z.object({
  id: z.string(),
  origin: z.enum(ORIGINS),
  reviewStatus: z.enum(REVIEW_STATUSES),
  publicationStatus: z.enum(PUBLICATION_STATUSES),
  situationStatus: z.enum(SITUATION_STATUSES),
  severity: severitySchema.nullable(),
  currentVersion: eventVersionSchema,
  authorId: z.string(),
  author: publicAuthorSchema,
  /** Exact point captured by the reporter. Private (spec decision 8). */
  privateLocation: geoPointSchema.nullable(),
  mergedIntoEventId: z.string().nullable(),
  contributionCount: z.number().int().min(0),
  hasOpenNeeds: z.boolean(),
  isDemo: z.boolean(),
  publishedAt: z.date().nullable(),
  lastUpdatedAt: z.date(),
  createdAt: z.date(),
});
export type Event = z.infer<typeof eventSchema>;

/** Public read model. No private location, no internal notes. */
export const publicEventSchema = eventSchema
  .omit({ privateLocation: true, authorId: true, currentVersion: true })
  .extend({
    versionSeq: z.number().int(),
    category: z.enum(EVENT_CATEGORIES),
    title: z.string(),
    description: z.string(),
    place: placeSchema,
    occurredAt: occurredAtSchema,
  });
export type PublicEvent = z.infer<typeof publicEventSchema>;

/** Step-by-step report submitted by a signed-in user. */
export const submitReportInputSchema = z.object({
  category: z.enum(EVENT_CATEGORIES),
  title: z.string().trim().min(1).max(REPORT_TITLE_MAX),
  description: z.string().trim().max(REPORT_DESCRIPTION_MAX),
  observedPersonally: z.enum(["yes", "no", "prefer_not_to_say"]),
  sourceUrl: z.url().nullable(),
  place: placeSchema,
  /** Exact point if the user picked or allowed it; kept private. */
  privateLocation: geoPointSchema.nullable(),
  occurredAt: occurredAtSchema,
  /** Set when the user confirmed the report is a different event from the suggestions. */
  dismissedDuplicateIds: z.array(z.string()).default([]),
});
export type SubmitReportInput = z.infer<typeof submitReportInputSchema>;

export const duplicateCandidateSchema = z.object({
  event: publicEventSchema,
  /** Straight-line distance; null when either side has only district precision. */
  approxDistanceKm: z.number().nullable(),
  hoursApart: z.number(),
});
export type DuplicateCandidate = z.infer<typeof duplicateCandidateSchema>;

export const findDuplicatesInputSchema = z.object({
  category: z.enum(EVENT_CATEGORIES),
  place: placeSchema,
  occurredAt: occurredAtSchema,
});
export type FindDuplicatesInput = z.infer<typeof findDuplicatesInputSchema>;

/** Shared filters (map, list, history). OR inside a filter, AND across filters. */
export const eventFiltersSchema = z.object({
  categories: z.array(z.enum(EVENT_CATEGORIES)).optional(),
  origins: z.array(z.enum(ORIGINS)).optional(),
  reviewStatuses: z.array(z.enum(REVIEW_STATUSES)).optional(),
  situationStatuses: z.array(z.enum(SITUATION_STATUSES)).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  /** Which date the period applies to. */
  dateField: z.enum(["occurred", "last_updated"]).default("occurred"),
  ubigeo: z.string().optional(),
  bounds: boundsSchema.optional(),
  withNeeds: z.boolean().optional(),
  text: z.string().max(100).optional(),
  includeDemo: z.boolean().default(true),
});
export type EventFilters = z.infer<typeof eventFiltersSchema>;

export const listEventsInputSchema = eventFiltersSchema.extend(listPageSchema.shape).extend({
  sort: z.enum(["last_updated", "occurred"]).default("last_updated"),
});
export type ListEventsInput = z.infer<typeof listEventsInputSchema>;

export const activityEntrySchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  type: z.enum(ACTIVITY_TYPES),
  actorRole: publicAuthorSchema.shape.role,
  summary: z.string(),
  at: z.date(),
  isDemo: z.boolean(),
});
export type ActivityEntry = z.infer<typeof activityEntrySchema>;
