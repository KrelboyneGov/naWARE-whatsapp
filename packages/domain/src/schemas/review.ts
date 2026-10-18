import { z } from "zod";
import {
  CORROBORATION_DECISIONS,
  ISSUE_TYPES,
  PUBLICATION_DECISIONS,
  PUBLICATION_STATUSES,
  QUEUE_REASONS,
  RELATION_DECISIONS,
} from "../constants";
import { listPageSchema } from "./common";
import { publicEventSchema } from "./event";

/** Every decision targets the version the moderator saw (ADR 0004). */
const decisionBase = z.object({
  eventId: z.string(),
  versionSeq: z.number().int().min(1),
  /** Shown to the author and, when relevant, on the public record. */
  publicReason: z.string().trim().min(1).max(500),
  /** Moderators only. */
  privateNote: z.string().max(2000).nullable(),
});

export const decidePublicationInputSchema = decisionBase.extend({
  decision: z.enum(PUBLICATION_DECISIONS),
});
export type DecidePublicationInput = z.infer<typeof decidePublicationInputSchema>;

export const decideCorroborationInputSchema = decisionBase.extend({
  decision: z.enum(CORROBORATION_DECISIONS),
  /** What exactly was checked, e.g. "coincidencia territorial de dos aportes". */
  aspectsChecked: z.array(z.string().min(1)).default([]),
  /** What remains uncertain. Required for corroborate_aspects and link_official_backing. */
  limits: z.string().max(500).nullable(),
  citedEvidenceIds: z.array(z.string()).default([]),
  officialNoticeId: z.string().nullable(),
});
export type DecideCorroborationInput = z.infer<typeof decideCorroborationInputSchema>;

export const decideRelationInputSchema = decisionBase.extend({
  decision: z.enum(RELATION_DECISIONS),
  otherEventId: z.string(),
  /** For split: the evidence to move to a new event. */
  evidenceIds: z.array(z.string()).default([]),
});
export type DecideRelationInput = z.infer<typeof decideRelationInputSchema>;

export const reportClosureInputSchema = decisionBase.extend({
  sourceUrl: z.url().nullable(),
  sourceDescription: z.string().min(1).max(300),
});
export type ReportClosureInput = z.infer<typeof reportClosureInputSchema>;

export const reviewDecisionSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  versionSeq: z.number().int(),
  kind: z.enum(["publication", "corroboration", "relation", "closure"]),
  decision: z.string(),
  actorId: z.string(),
  publicReason: z.string(),
  privateNote: z.string().nullable(),
  details: z.record(z.string(), z.unknown()),
  decidedAt: z.date(),
});
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;

/** Public part of a decision, for the "Sobre esta revisión" block and change history. */
export const publicReviewDecisionSchema = reviewDecisionSchema.omit({
  actorId: true,
  privateNote: true,
});
export type PublicReviewDecision = z.infer<typeof publicReviewDecisionSchema>;

export const reviewQueueItemSchema = z.object({
  event: publicEventSchema,
  reason: z.enum(QUEUE_REASONS),
  pendingVersionSeq: z.number().int(),
  pendingEvidenceCount: z.number().int(),
  assignedTo: z.string().nullable(),
  enteredQueueAt: z.date(),
});
export type ReviewQueueItem = z.infer<typeof reviewQueueItemSchema>;

export const reviewQueueFiltersSchema = listPageSchema.extend({
  reasons: z.array(z.enum(QUEUE_REASONS)).optional(),
  publicationStatuses: z.array(z.enum(PUBLICATION_STATUSES)).optional(),
  assignedToMe: z.boolean().optional(),
});
export type ReviewQueueFilters = z.infer<typeof reviewQueueFiltersSchema>;

export const reportIssueInputSchema = z.object({
  eventId: z.string(),
  type: z.enum(ISSUE_TYPES),
  explanation: z.string().trim().min(1).max(1000),
  url: z.url().nullable(),
});
export type ReportIssueInput = z.infer<typeof reportIssueInputSchema>;

export const issueReportSchema = reportIssueInputSchema.extend({
  id: z.string(),
  reporterId: z.string(),
  status: z.enum(["open", "resolved", "dismissed"]),
  createdAt: z.date(),
});
export type IssueReport = z.infer<typeof issueReportSchema>;
