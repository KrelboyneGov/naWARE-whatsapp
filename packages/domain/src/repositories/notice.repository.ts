import type { OfficialNotice } from "../schemas/source";

export interface IOfficialNoticeRepository {
  findById(id: string): Promise<OfficialNotice | null>;
  /** PostGIS ST_Intersects against the district; partialOverlap when not fully contained. */
  findIntersectingTerritory(
    ubigeo: string,
    opts: { includeExpired: boolean },
  ): Promise<{ notice: OfficialNotice; partialOverlap: boolean }[]>;
  listActive(at: Date): Promise<OfficialNotice[]>;
  /** Insert or update by (sourceId, externalId); returns whether it was new. */
  upsert(notice: OfficialNotice): Promise<"inserted" | "updated" | "unchanged">;
}
