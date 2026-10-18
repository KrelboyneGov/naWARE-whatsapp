import { and, asc, countDistinct, eq, inArray, isNull, or } from "drizzle-orm";
import type { IEvidenceRepository } from "@emergency-map/domain/repositories";
import type { Evidence } from "@emergency-map/domain/schemas";
import type { EvidenceVisibility, ReviewStatus } from "@emergency-map/domain/constants";
import { eventTable, evidenceTable } from "../schema";
import type { DatabaseClient } from "../client";
import { mapEvidenceToDomain, toEvidenceInsert } from "../mappers";

const ev = evidenceTable;

export class EvidenceRepository implements IEvidenceRepository {
  constructor(private db: DatabaseClient) {}

  /** Evidence of the event plus evidence of events merged into it (ADR 0004). */
  private belongsTo(eventId: string) {
    return or(
      eq(ev.eventId, eventId),
      inArray(
        ev.eventId,
        this.db
          .select({ id: eventTable.id })
          .from(eventTable)
          .where(eq(eventTable.mergedIntoEventId, eventId)),
      ),
    );
  }

  async findById(id: string): Promise<Evidence | null> {
    const rows = await this.db.select().from(ev).where(eq(ev.id, id)).limit(1);
    return rows[0] ? mapEvidenceToDomain(rows[0]) : null;
  }

  async listByEvent(eventId: string, opts: { includeNonPublic: boolean }): Promise<Evidence[]> {
    const rows = await this.db
      .select()
      .from(ev)
      .where(
        and(
          this.belongsTo(eventId),
          opts.includeNonPublic ? undefined : eq(ev.visibility, "public"),
        ),
      )
      .orderBy(asc(ev.receivedAt), asc(ev.id));
    return rows.map(mapEvidenceToDomain);
  }

  async findByFileHash(sha256: string): Promise<Evidence | null> {
    const rows = await this.db
      .select()
      .from(ev)
      .where(eq(ev.fileSha256, sha256))
      .orderBy(asc(ev.receivedAt))
      .limit(1);
    return rows[0] ? mapEvidenceToDomain(rows[0]) : null;
  }

  async create(evidence: Evidence & { fileSha256: string | null }): Promise<Evidence> {
    const rows = await this.db.insert(ev).values(toEvidenceInsert(evidence)).returning();
    return mapEvidenceToDomain(rows[0]!);
  }

  async update(
    id: string,
    patch: Partial<{ visibility: EvidenceVisibility; reviewStatus: ReviewStatus; eventId: string }>,
  ): Promise<void> {
    const set = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (Object.keys(set).length === 0) return;
    await this.db.update(ev).set(set).where(eq(ev.id, id));
  }

  /** Independent contributions = public, not duplicates, distinct authors. */
  async countIndependent(eventId: string): Promise<number> {
    const rows = await this.db
      .select({ count: countDistinct(ev.authorId) })
      .from(ev)
      .where(
        and(this.belongsTo(eventId), eq(ev.visibility, "public"), isNull(ev.duplicateOfEvidenceId)),
      );
    return rows[0]?.count ?? 0;
  }
}
