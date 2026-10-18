import type { Evidence } from "@emergency-map/domain/schemas";
import { evidenceTable } from "../schema";

type EvidenceRow = typeof evidenceTable.$inferSelect;

export function mapEvidenceToDomain(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    eventId: row.eventId,
    type: row.type,
    authorId: row.authorId,
    author: { displayName: row.authorDisplayName, role: row.authorRole },
    description: row.description,
    storageKey: row.storageKey,
    url: row.url,
    observedPersonally: row.observedPersonally,
    ownsImage: row.ownsImage,
    declaredCapturedAt:
      row.declaredCapturedPrecision && row.declaredCapturedStart
        ? {
            precision: row.declaredCapturedPrecision,
            start: row.declaredCapturedStart,
            end: row.declaredCapturedEnd,
          }
        : null,
    receivedAt: row.receivedAt,
    reviewStatus: row.reviewStatus,
    visibility: row.visibility,
    duplicateOfEvidenceId: row.duplicateOfEvidenceId,
    isDemo: row.isDemo,
  };
}

export function toEvidenceInsert(
  evidence: Evidence & { fileSha256: string | null },
): typeof evidenceTable.$inferInsert {
  return {
    id: evidence.id,
    eventId: evidence.eventId,
    type: evidence.type,
    authorId: evidence.authorId,
    authorDisplayName: evidence.author.displayName,
    authorRole: evidence.author.role,
    description: evidence.description,
    storageKey: evidence.storageKey,
    fileSha256: evidence.fileSha256,
    url: evidence.url,
    observedPersonally: evidence.observedPersonally,
    ownsImage: evidence.ownsImage,
    declaredCapturedPrecision: evidence.declaredCapturedAt?.precision ?? null,
    declaredCapturedStart: evidence.declaredCapturedAt?.start ?? null,
    declaredCapturedEnd: evidence.declaredCapturedAt?.end ?? null,
    receivedAt: evidence.receivedAt,
    reviewStatus: evidence.reviewStatus,
    visibility: evidence.visibility,
    duplicateOfEvidenceId: evidence.duplicateOfEvidenceId,
    isDemo: evidence.isDemo,
  };
}
