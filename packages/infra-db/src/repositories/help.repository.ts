import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type {
  ICollectionPointRepository,
  INeedRepository,
  IOrganizationRepository,
} from "@emergency-map/domain/repositories";
import type {
  CollectionPoint,
  ListCollectionPointsInput,
  ListNeedsInput,
  Need,
  Organization,
} from "@emergency-map/domain/schemas";
import type { NeedStatus, OrganizationMemberRole } from "@emergency-map/domain/constants";
import {
  collectionPointTable,
  needTable,
  organizationMemberTable,
  organizationTable,
} from "../schema";
import type { DatabaseClient } from "../client";
import {
  collectionPointSelection,
  mapCollectionPointToDomain,
  mapNeedToDomain,
  mapOrganizationToDomain,
  toCollectionPointInsert,
  toNeedInsert,
  toOrganizationInsert,
} from "../mappers";
import { distanceKm, pointSql } from "../utils/postgis";
import { coversUbigeo, escapeLike, textArray } from "./sql-helpers";

export class OrganizationRepository implements IOrganizationRepository {
  constructor(private db: DatabaseClient) {}

  async findById(id: string): Promise<Organization | null> {
    const rows = await this.db
      .select()
      .from(organizationTable)
      .where(eq(organizationTable.id, id))
      .limit(1);
    return rows[0] ? mapOrganizationToDomain(rows[0]) : null;
  }

  async listCoveringTerritory(ubigeo: string): Promise<Organization[]> {
    const rows = await this.db
      .select()
      .from(organizationTable)
      .where(coversUbigeo(organizationTable.coverage, ubigeo))
      .orderBy(asc(organizationTable.name));
    return rows.map(mapOrganizationToDomain);
  }

  async create(org: Organization): Promise<Organization> {
    const rows = await this.db
      .insert(organizationTable)
      .values(toOrganizationInsert(org))
      .returning();
    return mapOrganizationToDomain(rows[0]!);
  }

  async addMember(input: {
    organizationId: string;
    userId: string;
    role: OrganizationMemberRole;
  }): Promise<void> {
    await this.db
      .insert(organizationMemberTable)
      .values(input)
      .onConflictDoUpdate({
        target: [organizationMemberTable.organizationId, organizationMemberTable.userId],
        set: { role: input.role },
      });
  }

  async listOrganizationIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: organizationMemberTable.organizationId })
      .from(organizationMemberTable)
      .where(eq(organizationMemberTable.userId, userId));
    return rows.map((r) => r.id);
  }
}

export class NeedRepository implements INeedRepository {
  constructor(private db: DatabaseClient) {}

  async findById(id: string): Promise<Need | null> {
    const rows = await this.db.select().from(needTable).where(eq(needTable.id, id)).limit(1);
    return rows[0] ? mapNeedToDomain(rows[0]) : null;
  }

  async list(input: ListNeedsInput, now: Date): Promise<Need[]> {
    const n = needTable;
    const conds: (SQL | undefined)[] = [];
    if (input.ubigeo) {
      // A need for a department covers its districts, and the other way round for a search.
      const like = escapeLike(input.ubigeo);
      conds.push(
        sql`(${n.destinationUbigeo} LIKE ${like + "%"} OR ${input.ubigeo}::text LIKE ${n.destinationUbigeo} || '%')`,
      );
    }
    if (input.categories?.length) conds.push(inArray(n.category, input.categories));
    if (input.organizationId) conds.push(eq(n.organizationId, input.organizationId));
    if (input.eventId) conds.push(eq(n.eventId, input.eventId));
    if (input.onlyActive !== false) {
      conds.push(notInArray(n.status, ["covered", "expired"]));
      conds.push(or(isNull(n.deadline), gt(n.deadline, now)));
    }
    const rows = await this.db
      .select()
      .from(n)
      .where(and(...conds))
      .orderBy(desc(n.updatedAt), asc(n.id));
    return rows.map(mapNeedToDomain);
  }

  async create(need: Need): Promise<Need> {
    const rows = await this.db.insert(needTable).values(toNeedInsert(need)).returning();
    return mapNeedToDomain(rows[0]!);
  }

  /** Authorization lives in the query: the row only changes when it belongs to the organization. */
  async updateStatus(
    id: string,
    organizationId: string,
    status: NeedStatus,
    note: string,
    at: Date,
  ): Promise<boolean> {
    const rows = await this.db
      .update(needTable)
      .set({ status, statusNote: note, updatedAt: at })
      .where(and(eq(needTable.id, id), eq(needTable.organizationId, organizationId)))
      .returning({ id: needTable.id });
    return rows.length > 0;
  }
}

export class CollectionPointRepository implements ICollectionPointRepository {
  constructor(private db: DatabaseClient) {}

  async findById(id: string): Promise<CollectionPoint | null> {
    const rows = await this.db
      .select(collectionPointSelection)
      .from(collectionPointTable)
      .where(eq(collectionPointTable.id, id))
      .limit(1);
    return rows[0] ? mapCollectionPointToDomain(rows[0]) : null;
  }

  async list(
    input: ListCollectionPointsInput,
  ): Promise<{ point: CollectionPoint; distanceKm: number | null }[]> {
    const c = collectionPointTable;
    const conds: (SQL | undefined)[] = [sql`${c.status} <> 'withdrawn'`];
    if (input.ubigeo) conds.push(sql`${c.territoryUbigeo} LIKE ${escapeLike(input.ubigeo) + "%"}`);
    if (input.accepts?.length) {
      conds.push(sql`jsonb_exists_any(${c.accepts}, ${textArray(input.accepts)})`);
    }
    if (input.organizationId) conds.push(eq(c.organizationId, input.organizationId));

    const near = input.near ? pointSql(input.near) : null;
    if (near && input.radiusKm) {
      conds.push(
        sql`ST_DWithin(${c.location}::geography, ${near}::geography, ${input.radiusKm * 1000}::float8)`,
      );
    }
    const distance = near ? distanceKm(c.location, near) : sql<null>`NULL::float8`;

    const rows = await this.db
      .select({ ...collectionPointSelection, distanceKm: distance })
      .from(c)
      .where(and(...conds))
      .orderBy(near ? sql`${distance} ASC` : asc(c.name), asc(c.id));
    return rows.map((row) => {
      const { distanceKm: d, ...rest } = row;
      return {
        point: mapCollectionPointToDomain(rest),
        distanceKm: d === null || d === undefined ? null : Number(d),
      };
    });
  }

  async create(point: CollectionPoint): Promise<CollectionPoint> {
    await this.db.insert(collectionPointTable).values(toCollectionPointInsert(point));
    return (await this.findById(point.id)) ?? point;
  }
}
