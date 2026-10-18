import type { Actor, AddEvidenceInput, Evidence } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import { canViewEvent } from "../events/visibility";
import type { UseCaseResult } from "../shared/result";
import { notFound, unauthenticated, validation } from "../shared/result";
import type { EvidenceDeps } from "./deps";

/**
 * Adds a contribution to an event. A file already uploaded (same SHA-256) is stored but flagged
 * as a duplicate so it never counts as an independent contribution (failure 3). Adding evidence
 * only enqueues a review; it never changes the event's review status (failure 1).
 */
export async function addEvidence(
  deps: EvidenceDeps,
  input: AddEvidenceInput,
  actor?: Actor,
): Promise<UseCaseResult<Evidence>> {
  if (!actor) return unauthenticated();

  const event = await deps.events.findById(input.eventId);
  if (!event || !canViewEvent(event, actor)) return notFound("event", input.eventId);
  if (event.publicationStatus === "merged" || event.publicationStatus === "rejected") {
    return validation("eventId", "Evidence cannot be added to a merged or rejected event");
  }

  if (input.type === "photo" && input.storageKey === null) {
    return validation("storageKey", "A photo needs an uploaded file");
  }
  if (input.type === "document_link" && input.url === null) {
    return validation("url", "A document link needs a URL");
  }

  const now = deps.clock.now();
  const existing = input.fileSha256 ? await deps.evidence.findByFileHash(input.fileSha256) : null;

  const evidence = await deps.evidence.create({
    id: deps.ids.next("evd"),
    eventId: input.eventId,
    type: input.type,
    authorId: actor.userId,
    author: { displayName: actor.publicName, role: "citizen" },
    description: input.description,
    storageKey: input.storageKey,
    url: input.url,
    observedPersonally: input.observedPersonally,
    ownsImage: input.ownsImage,
    declaredCapturedAt: input.declaredCapturedAt,
    receivedAt: now,
    reviewStatus: "unverified",
    visibility: "pending",
    duplicateOfEvidenceId: existing ? existing.id : null,
    isDemo: false,
    fileSha256: input.fileSha256,
  });

  await deps.review.enqueue({
    eventId: event.id,
    reason: "new_evidence",
    versionSeq: event.currentVersion.seq,
    at: now,
  });

  if (event.publicationStatus === "published") {
    await deps.events.appendActivity({
      id: deps.ids.next("act"),
      eventId: event.id,
      eventTitle: event.currentVersion.title,
      type: "new_evidence",
      actorRole: "citizen",
      summary: `New evidence for: ${event.currentVersion.title}`,
      at: now,
      isDemo: false,
    });
  }

  return ok(evidence);
}
