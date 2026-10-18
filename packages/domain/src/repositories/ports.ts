import type { AreaGeometry, Bounds, GeoPoint } from "../schemas/common";
import type { ZodType } from "zod";
import type { Layer } from "../constants";
import type { IngestBatch } from "../schemas/ingest";
import type { OfficialNotice } from "../schemas/source";

export interface IClock {
  now(): Date;
}

export interface IIdGenerator {
  next(prefix: string): string;
}

export interface IFileStorage {
  createUploadUrl(input: {
    key: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<{ uploadUrl: string; expiresAt: Date; simulated: boolean }>;
  publicUrl(key: string): string | null;
}

/** One adapter per official source; a page change breaks only its own importer. */
export interface IOfficialNoticeImporter {
  readonly sourceId: string;
  fetchNotices(): Promise<Omit<OfficialNotice, "id" | "fetchedAt" | "validity">[]>;
}

export type { AreaGeometry, Bounds, GeoPoint };

/**
 * Ingestor<T> (ADR 0008): one implementation per source and layer, so a change in one page or
 * API breaks only its own ingestor. `fetch` returns normalized records; storing them, deduping
 * by (sourceId, externalId) and recording the IngestRun (`ImportRun`) belong to the use case.
 */
export interface Ingestor<T> {
  readonly sourceId: string;
  readonly layer: Layer;
  /** Zod schema `T` is validated against before it is stored. */
  readonly payloadSchema: ZodType<T>;
  fetch(context: {
    /** Only records published after this time, when the source supports it. */
    since: Date | null;
    signal?: AbortSignal;
  }): Promise<IngestBatch<T>>;
}
