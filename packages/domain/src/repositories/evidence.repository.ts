import type { Evidence } from "../schemas/evidence";
import type { EvidenceVisibility, ReviewStatus } from "../constants";

export interface IEvidenceRepository {
  findById(id: string): Promise<Evidence | null>;
  listByEvent(eventId: string, opts: { includeNonPublic: boolean }): Promise<Evidence[]>;
  findByFileHash(sha256: string): Promise<Evidence | null>;
  create(evidence: Evidence & { fileSha256: string | null }): Promise<Evidence>;
  update(
    id: string,
    patch: Partial<{ visibility: EvidenceVisibility; reviewStatus: ReviewStatus; eventId: string }>,
  ): Promise<void>;
  /** Independent contributions = public, not duplicates, distinct authors. */
  countIndependent(eventId: string): Promise<number>;
}
