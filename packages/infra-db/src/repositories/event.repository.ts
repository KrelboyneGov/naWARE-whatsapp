import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { IEventRepository, EventPage } from "@emergency-map/domain/repositories";
import type {
  ActivityEntry,
  Event,
  EventFilters,
  EventVersion,
} from "@emergency-map/domain/schemas";
import type {
  EventCategory,
  PublicationStatus,
  ReviewStatus,
  SituationStatus,
} from "@emergency-map/domain/constants";
import type { GeoPoint } from "@emergency-map/domain/schemas";
import { activityTable, eventTable, eventVersionTable } from "../schema";
import type { DatabaseClient } from "../client";
import {
  eventSelection,
  mapEventToDomain,
  mapVersionToDomain,
  privateLocationColumn,
  toEventInsert,
  toVersionInsert,
  versionSelection,
} from "../mappers";
import { distanceKm, pointSql } from "../utils/postgis";
import { escapeLike } from "./sql-helpers";

const e = eventTable;
const v = eventVersionTable;

const currentVersionJoin = and(eq(v.eventId, e.id), eq(v.seq, e.currentVersionSeq));

/** Conditions that make an event publicly listable (published, not merged). */
const publiclyListable = (): SQL[] => [
  eq(e.publicationStatus, "published"),
  isNull(e.mergedIntoEventId),
];

/**
 * Translates `EventFilters` into SQL conditions: OR inside a filter (`IN`), AND across filters.
 * `skipDates` lets the activity feed apply the period to the activity timestamp instead.
 */
export function eventFilterConditions(
  filters: EventFilters,
  opts: { skipDates?: boolean } = {},
): SQL[] {
  const conds: SQL[] = [];
  if (filters.categories?.length) conds.push(inArray(v.category, filters.categories));
  if (filters.origins?.length) conds.push(inArray(e.origin, filters.origins));
  if (filters.reviewStatuses?.length) conds.push(inArray(e.reviewStatus, filters.reviewStatuses));
  if (filters.situationStatuses?.length) {
    conds.push(inArray(e.situationStatus, filters.situationStatuses));
  }
  if (!opts.skipDates) {
    if (filters.dateField === "last_updated") {
      if (filters.from) conds.push(gte(e.lastUpdatedAt, filters.from));
      if (filters.to) conds.push(lte(e.lastUpdatedAt, filters.to));
    } else {
      // Period overlap: an interval event counts when any part of it falls inside the period.
      if (filters.from)
        conds.push(gte(sql`coalesce(${v.occurredEnd}, ${v.occurredStart})`, filters.from));
      if (filters.to) conds.push(lte(v.occurredStart, filters.to));
    }
  }
  if (filters.ubigeo) {
    conds.push(sql`${v.territoryUbigeo} LIKE ${escapeLike(filters.ubigeo) + "%"}`);
  }
  if (filters.bounds) {
    const [west, south, east, north] = filters.bounds;
    conds.push(
      sql`${v.placePoint} && ST_MakeEnvelope(${west}::float8, ${south}::float8, ${east}::float8, ${north}::float8, 4326)`,
    );
  }
  if (filters.withNeeds) conds.push(eq(e.hasOpenNeeds, true));
  if (filters.text?.trim()) {
    const pattern = `%${escapeLike(filters.text.trim())}%`;
    conds.push(
      sql`(${v.title} ILIKE ${pattern} OR ${v.description} ILIKE ${pattern} OR ${v.territoryName} ILIKE ${pattern})`,
    );
  }
  if (filters.includeDemo === false) conds.push(eq(e.isDemo, false));
  return conds;
}

export class EventRepository implements IEventRepository {
  constructor(private db: DatabaseClient) {}

  async findById(id: string): Promise<Event | null> {
    const rows = await this.db
      .select({ ...eventSelection, privateLocation: privateLocationColumn })
      .from(e)
      .innerJoin(v, currentVersionJoin)
      .where(eq(e.id, id))
      .limit(1);
    return rows[0] ? mapEventToDomain(rows[0]) : null;
  }

  async listPublic(
    filters: EventFilters,
    page: { limit: number; offset: number },
    sort: "last_updated" | "occurred",
  ): Promise<EventPage> {
    const where = and(...publiclyListable(), ...eventFilterConditions(filters));
    const order =
      sort === "occurred"
        ? [desc(v.occurredStart), desc(e.id)]
        : [desc(e.lastUpdatedAt), desc(e.id)];

    const [rows, totals] = await Promise.all([
      this.db
        .select(eventSelection)
        .from(e)
        .innerJoin(v, currentVersionJoin)
        .where(where)
        .orderBy(...order)
        .limit(page.limit)
        .offset(page.offset),
      this.db.select({ count: count() }).from(e).innerJoin(v, currentVersionJoin).where(where),
    ]);
    return { data: rows.map(mapEventToDomain), total: totals[0]?.count ?? 0 };
  }

  async listVersions(eventId: string): Promise<EventVersion[]> {
    const rows = await this.db
      .select(versionSelection)
      .from(v)
      .where(eq(v.eventId, eventId))
      .orderBy(asc(v.seq));
    return rows.map(mapVersionToDomain);
  }

  async findCandidates(input: {
    category: EventCategory;
    point: GeoPoint | null;
    ubigeo: string;
    from: Date;
    to: Date;
    radiusKm: number;
    limit: number;
  }): Promise<{ event: Event; distanceKm: number | null }[]> {
    const { point } = input;
    // With a point: events within the radius, plus district-precision events matched by ubigeo.
    // Without a point: everything in the same district. Distance is null for the latter.
    const where = point
      ? or(
          and(
            isNotNull(v.placePoint),
            sql`ST_DWithin(${v.placePoint}::geography, ${pointSql(point)}::geography, ${input.radiusKm * 1000}::float8)`,
          ),
          and(isNull(v.placePoint), eq(v.territoryUbigeo, input.ubigeo)),
        )
      : eq(v.territoryUbigeo, input.ubigeo);

    const distance = point
      ? sql<
          number | null
        >`CASE WHEN ${v.placePoint} IS NULL THEN NULL ELSE ${distanceKm(v.placePoint, pointSql(point))} END`
      : sql<number | null>`NULL::float8`;

    const rows = await this.db
      .select({ ...eventSelection, distanceKm: distance })
      .from(e)
      .innerJoin(v, currentVersionJoin)
      .where(
        and(
          eq(v.category, input.category),
          inArray(e.publicationStatus, ["published", "pending_review"]),
          isNull(e.mergedIntoEventId),
          gte(v.occurredStart, input.from),
          lte(v.occurredStart, input.to),
          where,
        ),
      )
      .orderBy(sql`${distance} ASC NULLS LAST`, desc(v.occurredStart))
      .limit(input.limit);

    return rows.map((row) => ({
      event: mapEventToDomain(row),
      distanceKm: row.distanceKm === null ? null : Number(row.distanceKm),
    }));
  }

  async create(event: Event): Promise<Event> {
    // Persists the embedded currentVersion (seq 1) as the first event_version row and sets
    // current_version_seq from it, atomically. addVersion is only for seq >= 2.
    // neon-http has no interactive transactions; batch runs both inserts atomically.
    await this.db.batch([
      this.db.insert(e).values(toEventInsert(event)),
      this.db.insert(v).values(toVersionInsert(event.currentVersion)),
    ]);
    return (await this.findById(event.id)) ?? event;
  }

  async addVersion(version: EventVersion): Promise<void> {
    await this.db.insert(v).values(toVersionInsert(version));
  }

  async updateStatus(
    id: string,
    expectedSeq: number,
    patch: Partial<{
      reviewStatus: ReviewStatus;
      publicationStatus: PublicationStatus;
      situationStatus: SituationStatus;
      currentVersionSeq: number;
      mergedIntoEventId: string | null;
      contributionCount: number;
      publishedAt: Date | null;
      lastUpdatedAt: Date;
    }>,
  ): Promise<boolean> {
    const set = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    const guard = and(eq(e.id, id), eq(e.currentVersionSeq, expectedSeq));
    if (Object.keys(set).length === 0) {
      const found = await this.db.select({ id: e.id }).from(e).where(guard).limit(1);
      return found.length > 0;
    }
    const updated = await this.db.update(e).set(set).where(guard).returning({ id: e.id });
    return updated.length > 0;
  }

  async listActivity(
    filters: EventFilters,
    page: { limit: number; offset: number },
  ): Promise<{ data: ActivityEntry[]; total: number }> {
    const a = activityTable;
    const conds = [...publiclyListable(), ...eventFilterConditions(filters, { skipDates: true })];
    if (filters.from) conds.push(gte(a.at, filters.from));
    if (filters.to) conds.push(lte(a.at, filters.to));
    const where = and(...conds);

    const [rows, totals] = await Promise.all([
      this.db
        .select(getActivityColumns())
        .from(a)
        .innerJoin(e, eq(a.eventId, e.id))
        .innerJoin(v, currentVersionJoin)
        .where(where)
        .orderBy(desc(a.at), desc(a.id))
        .limit(page.limit)
        .offset(page.offset),
      this.db
        .select({ count: count() })
        .from(a)
        .innerJoin(e, eq(a.eventId, e.id))
        .innerJoin(v, currentVersionJoin)
        .where(where),
    ]);
    return { data: rows, total: totals[0]?.count ?? 0 };
  }

  async appendActivity(entry: ActivityEntry): Promise<void> {
    await this.db.insert(activityTable).values({
      id: entry.id,
      eventId: entry.eventId,
      eventTitle: entry.eventTitle,
      type: entry.type,
      actorRole: entry.actorRole,
      summary: entry.summary,
      at: entry.at,
      isDemo: entry.isDemo,
    });
  }
}

function getActivityColumns() {
  const a = activityTable;
  return {
    id: a.id,
    eventId: a.eventId,
    eventTitle: a.eventTitle,
    type: a.type,
    actorRole: a.actorRole,
    summary: a.summary,
    at: a.at,
    isDemo: a.isDemo,
  };
}
