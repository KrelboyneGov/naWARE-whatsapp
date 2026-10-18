import type { AreaGeometry, Bounds, GeoPoint } from "../schemas/common";
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
