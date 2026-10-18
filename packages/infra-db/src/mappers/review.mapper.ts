import type { IssueReport, ReviewDecision } from "@emergency-map/domain/schemas";
import { issueReportTable, reviewDecisionTable } from "../schema";

export function mapDecisionToDomain(row: typeof reviewDecisionTable.$inferSelect): ReviewDecision {
  return {
    id: row.id,
    eventId: row.eventId,
    versionSeq: row.versionSeq,
    kind: row.kind,
    decision: row.decision,
    actorId: row.actorId,
    publicReason: row.publicReason,
    privateNote: row.privateNote,
    details: row.details,
    decidedAt: row.decidedAt,
  };
}

export const toDecisionInsert = (d: ReviewDecision): typeof reviewDecisionTable.$inferInsert => ({
  id: d.id,
  eventId: d.eventId,
  versionSeq: d.versionSeq,
  kind: d.kind,
  decision: d.decision,
  actorId: d.actorId,
  publicReason: d.publicReason,
  privateNote: d.privateNote,
  details: d.details,
  decidedAt: d.decidedAt,
});

export const toIssueInsert = (i: IssueReport): typeof issueReportTable.$inferInsert => ({
  id: i.id,
  eventId: i.eventId,
  type: i.type,
  explanation: i.explanation,
  url: i.url,
  reporterId: i.reporterId,
  status: i.status,
  createdAt: i.createdAt,
});
