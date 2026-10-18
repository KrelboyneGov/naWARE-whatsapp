import { z } from "zod";
import { LAYERS, type Layer } from "../constants";

/** One record fetched from a source, before it is stored. `payload` is already normalized. */
export const ingestItemSchema = <T extends z.ZodType>(payload: T) =>
  z.object({
    /** Identifier given by the source; (sourceId, externalId) is unique. */
    externalId: z.string().min(1),
    payload,
    /** Link to the original record when the source provides one. */
    sourceUrl: z.url().nullable(),
    /** Publication time declared by the source, if any. */
    sourcePublishedAt: z.date().nullable(),
  });

/** Result of one fetch of one source. */
export const ingestBatchSchema = <T extends z.ZodType>(payload: T) =>
  z.object({
    sourceId: z.string(),
    layer: z.enum(LAYERS),
    items: z.array(ingestItemSchema(payload)),
    /** Records that could not be normalized (e.g. no location), with the reason. */
    rejected: z.array(z.object({ externalId: z.string().nullable(), reason: z.string() })),
    /** Object storage key of the raw response kept for traceability, when stored. */
    rawRef: z.string().nullable(),
    fetchedAt: z.date(),
  });

export type IngestItem<T> = {
  externalId: string;
  payload: T;
  sourceUrl: string | null;
  sourcePublishedAt: Date | null;
};

export type IngestBatch<T> = {
  sourceId: string;
  layer: Layer;
  items: IngestItem<T>[];
  rejected: { externalId: string | null; reason: string }[];
  rawRef: string | null;
  fetchedAt: Date;
};
