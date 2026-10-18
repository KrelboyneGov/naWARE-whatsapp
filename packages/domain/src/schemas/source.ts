import { z } from "zod";
import {
  EVENT_CATEGORIES,
  IMPORT_RUN_STATUSES,
  NOTICE_VALIDITIES,
  SOURCE_ACCESS_KINDS,
  SOURCE_HEALTHS,
} from "../constants";
import { areaGeometrySchema, territoryRefSchema } from "./common";
import { severitySchema } from "./event";

export const dataSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  institution: z.string(),
  infoType: z.string(),
  accessKind: z.enum(SOURCE_ACCESS_KINDS),
  coverage: z.string(),
  originalUrl: z.url().nullable(),
  /** Last publication date reported by the source itself. */
  lastPublishedAt: z.date().nullable(),
  /** Last time *we* fetched successfully. Never shown as the source's publication time. */
  lastSuccessfulFetchAt: z.date().nullable(),
  health: z.enum(SOURCE_HEALTHS),
  isDemo: z.boolean(),
});
export type DataSource = z.infer<typeof dataSourceSchema>;

export const importRunSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  status: z.enum(IMPORT_RUN_STATUSES),
  processed: z.number().int(),
  duplicatesAvoided: z.number().int(),
  errorSummary: z.string().nullable(),
});
export type ImportRun = z.infer<typeof importRunSchema>;

/** An official notice keeps the issuer's identifier, legend and validity untouched. */
export const officialNoticeSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  externalId: z.string(),
  institution: z.string(),
  title: z.string(),
  category: z.enum(EVENT_CATEGORIES),
  severity: severitySchema.nullable(),
  /** Real URL only; null renders "Fuente simulada, enlace no disponible". */
  url: z.url().nullable(),
  issuedAt: z.date(),
  validFrom: z.date(),
  validTo: z.date().nullable(),
  validity: z.enum(NOTICE_VALIDITIES),
  geometry: areaGeometrySchema.nullable(),
  territories: z.array(territoryRefSchema),
  fetchedAt: z.date(),
  isDemo: z.boolean(),
});
export type OfficialNotice = z.infer<typeof officialNoticeSchema>;
