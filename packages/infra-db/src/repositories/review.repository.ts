import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import type { IReviewRepository } from "@emergency-map/domain/repositories";
import type {
  IssueReport,
  ReviewDecision,
  ReviewQueueFilters,
  ReviewQueueItem,
} from "@emergency-map/domain/schemas";
import type { QueueReason } from "@emergency-map/domain/constants";
import {
  eventTable,
  eventVersionTable,
  evidenceTable,
  issueReportTable,
  reviewDecisionTable,
  reviewQueueTable,
} from "../schema";
import type { DatabaseClient } from "../client";
import {
  eventSelection,
  mapDecisionToDomain,
  mapEventToDomain,
  toDecisionInsert,
  toIssueInsert,
  toPublicEvent,
} from "../mappers";

const q = reviewQueueTable;
const e = eventTable;
const v = eventVersionTable;

export class ReviewRepository implements IReviewRepository {
  constructor(private db: DatabaseClient) {}

  async listQueue(
    filters: ReviewQueueFilters,
    actorId: string,
  ): Promise<{ data: ReviewQueueItem[]; total: number }> {
    const where = and(
      filters.reasons?.length ? inArray(q.reason, filters.reasons) : undefined,
      filters.publicationStatuses?.length
        ? inArray(e.publicationStatus, filters.publicationStatuses)
        : undefined,
      filters.assignedToMe ? eq(q.assignedTo, actorId) : undefined,
    );
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const [rows, totals] = await Promise.all([
      this.db
        .select({
          ...eventSelection,
          reason: q.reason,
          pendingVersionSeq: q.versionSeq,
          assignedTo: q.assignedTo,
          enteredQueueAt: q.enteredAt,
          pendingEvidenceCount: sql<number>`(SELECT count(*)::int FROM ${evidenceTable} WHERE ${evidenceTable.eventId} = ${e.id} AND ${evidenceTable.visibility} = 'pending')`,
        })
        .from(q)
        .innerJoin(e, eq(q.eventId, e.id))
        .innerJoin(v, and(eq(v.eventId, e.id), eq(v.seq, e.currentVersionSeq)))
        .where(where)
        .orderBy(asc(q.enteredAt), asc(q.eventId))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ count: count() }).from(q).innerJoin(e, eq(q.eventId, e.id)).where(where),
    ]);

    return {
      data: rows.map((row) => ({
        event: toPublicEvent(mapEventToDomain(row)),
        reason: row.reason,
        pendingVersionSeq: row.pendingVersionSeq,
        pendingEvidenceCount: Number(row.pendingEvidenceCount),
        assignedTo: row.assignedTo,
        enteredQueueAt: row.enteredQueueAt,
      })),
      total: totals[0]?.count ?? 0,
    };
  }

  async enqueue(item: {
    eventId: string;
    reason: QueueReason;
    versionSeq: number;
    at: Date;
  }): Promise<void> {
    await this.db
      .insert(q)
      .values({
        eventId: item.eventId,
        reason: item.reason,
        versionSeq: item.versionSeq,
        enteredAt: item.at,
      })
      .onConflictDoUpdate({
        target: q.eventId,
        set: { reason: item.reason, versionSeq: item.versionSeq, enteredAt: item.at },
      });
  }

  async dequeue(eventId: string): Promise<void> {
    await this.db.delete(q).where(eq(q.eventId, eventId));
  }

  async assign(eventId: string, userId: string): Promise<void> {
    await this.db.update(q).set({ assignedTo: userId }).where(eq(q.eventId, eventId));
  }

  async listDecisions(eventId: string): Promise<ReviewDecision[]> {
    const rows = await this.db
      .select()
      .from(reviewDecisionTable)
      .where(eq(reviewDecisionTable.eventId, eventId))
      .orderBy(asc(reviewDecisionTable.decidedAt), asc(reviewDecisionTable.id));
    return rows.map(mapDecisionToDomain);
  }

  async recordDecision(decision: ReviewDecision): Promise<void> {
    await this.db.insert(reviewDecisionTable).values(toDecisionInsert(decision));
  }

  async createIssue(issue: IssueReport): Promise<void> {
    await this.db.insert(issueReportTable).values(toIssueInsert(issue));
  }
}
