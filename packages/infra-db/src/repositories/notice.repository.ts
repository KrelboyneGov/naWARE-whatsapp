import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { IOfficialNoticeRepository } from "@emergency-map/domain/repositories";
import type { OfficialNotice } from "@emergency-map/domain/schemas";
import { officialNoticeTable, territoryTable } from "../schema";
import type { DatabaseClient } from "../client";
import { mapNoticeToDomain, noticeSelection, toNoticeInsert } from "../mappers";

const n = officialNoticeTable;
const t = territoryTable;

const COORD_DECIMALS = 9; // ST_AsGeoJSON default precision

/** Stable JSON: sorted keys, coordinates rounded like PostGIS output, Polygon promoted to MultiPolygon. */
function canonical(value: unknown): unknown {
  if (typeof value === "number") return Number(value.toFixed(COORD_DECIMALS));
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  }
  return value;
}

/** Content fingerprint for upserts; `id` and `fetchedAt` do not count as a change. */
const fingerprint = (notice: OfficialNotice): string => {
  const geometry =
    notice.geometry?.type === "Polygon"
      ? { type: "MultiPolygon", coordinates: [notice.geometry.coordinates] }
      : notice.geometry;
  const { id: _id, fetchedAt: _fetched, ...rest } = notice;
  return JSON.stringify(canonical({ ...rest, geometry }));
};

export class OfficialNoticeRepository implements IOfficialNoticeRepository {
  constructor(private db: DatabaseClient) {}

  async findById(id: string): Promise<OfficialNotice | null> {
    const rows = await this.db.select(noticeSelection).from(n).where(eq(n.id, id)).limit(1);
    return rows[0] ? mapNoticeToDomain(rows[0]) : null;
  }

  async findIntersectingTerritory(
    ubigeo: string,
    opts: { includeExpired: boolean },
  ): Promise<{ notice: OfficialNotice; partialOverlap: boolean }[]> {
    const bothGeometries = sql`${t.geometry} IS NOT NULL AND ${n.geometry} IS NOT NULL`;
    // Boundary known: ST_Intersects. Boundary unknown: the district centroid must fall inside the
    // notice polygon. Notice without polygon: fall back to its declared territories.
    const intersects = sql`CASE
      WHEN ${bothGeometries} THEN ST_Intersects(${n.geometry}, ${t.geometry})
      WHEN ${n.geometry} IS NOT NULL THEN ST_Within(${t.centroid}, ${n.geometry})
      ELSE ${n.territories} @> jsonb_build_array(jsonb_build_object('ubigeo', ${ubigeo}::text))
    END`;
    // Fully contained district = not partial. Centroid-only match cannot prove full coverage.
    const partial = sql<boolean>`CASE
      WHEN ${bothGeometries} THEN NOT ST_Within(${t.geometry}, ${n.geometry})
      WHEN ${n.geometry} IS NOT NULL THEN true
      ELSE false
    END`;

    const rows = await this.db
      .select({ notice: noticeSelection, partialOverlap: partial })
      .from(n)
      .innerJoin(t, eq(t.ubigeo, ubigeo))
      .where(and(intersects, opts.includeExpired ? undefined : eq(n.validity, "active")))
      .orderBy(desc(n.issuedAt), desc(n.id));
    return rows.map((r) => ({
      notice: mapNoticeToDomain(r.notice),
      partialOverlap: r.partialOverlap,
    }));
  }

  async listActive(at: Date): Promise<OfficialNotice[]> {
    const rows = await this.db
      .select(noticeSelection)
      .from(n)
      .where(
        and(
          eq(n.validity, "active"),
          lte(n.validFrom, at),
          or(isNull(n.validTo), gt(n.validTo, at)),
        ),
      )
      .orderBy(desc(n.issuedAt));
    return rows.map(mapNoticeToDomain);
  }

  async upsert(notice: OfficialNotice): Promise<"inserted" | "updated" | "unchanged"> {
    const existingRows = await this.db
      .select(noticeSelection)
      .from(n)
      .where(and(eq(n.sourceId, notice.sourceId), eq(n.externalId, notice.externalId)))
      .limit(1);
    const existing = existingRows[0] ? mapNoticeToDomain(existingRows[0]) : null;

    if (!existing) {
      await this.db.insert(n).values(toNoticeInsert(notice));
      return "inserted";
    }
    if (fingerprint(existing) === fingerprint(notice)) {
      // Keep the last successful fetch time fresh without calling it a content change.
      await this.db.update(n).set({ fetchedAt: notice.fetchedAt }).where(eq(n.id, existing.id));
      return "unchanged";
    }
    const { id: _id, ...values } = toNoticeInsert({ ...notice, id: existing.id });
    await this.db.update(n).set(values).where(eq(n.id, existing.id));
    return "updated";
  }
}
