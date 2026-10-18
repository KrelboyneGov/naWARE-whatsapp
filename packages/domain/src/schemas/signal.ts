import { z } from "zod";
import { COMMUNITY_STATES, HAZARD_TYPES, SIGNAL_KINDS } from "../constants";
import { geoPointSchema } from "./common";

/**
 * "¿Sigue ahí?" answer from one person about one event. `reporterKey` is the user id, or an
 * anonymous device key when the person is not signed in; the latest signal per key wins.
 */
export const eventSignalSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  reporterKey: z.string(),
  isAnonymous: z.boolean(),
  kind: z.enum(SIGNAL_KINDS),
  createdAt: z.date(),
  isDemo: z.boolean(),
});
export type EventSignal = z.infer<typeof eventSignalSchema>;

export const submitSignalInputSchema = z.object({
  eventId: z.string(),
  kind: z.enum(SIGNAL_KINDS),
});
export type SubmitSignalInput = z.infer<typeof submitSignalInputSchema>;

/** What the event card shows about neighbours. Counts are distinct people, not taps. */
export const signalSummarySchema = z.object({
  stillThere: z.number().int().min(0),
  notThere: z.number().int().min(0),
  worse: z.number().int().min(0),
  lastSignalAt: z.date().nullable(),
  state: z.enum(COMMUNITY_STATES),
});
export type SignalSummary = z.infer<typeof signalSummarySchema>;

/**
 * Two-tap report: what and where. The point comes from the device and is published as
 * approximate. Everything else (title, time precision, evidence) can be added later.
 */
export const quickReportInputSchema = z.object({
  hazardType: z.enum(HAZARD_TYPES),
  point: geoPointSchema,
  note: z.string().trim().max(280).default(""),
});
export type QuickReportInput = z.infer<typeof quickReportInputSchema>;

/** A quick report as stored before it becomes (or joins) an event. */
export const quickReportSchema = quickReportInputSchema.extend({
  id: z.string(),
  reporterKey: z.string(),
  isAnonymous: z.boolean(),
  createdAt: z.date(),
  isDemo: z.boolean(),
});
export type QuickReport = z.infer<typeof quickReportSchema>;
