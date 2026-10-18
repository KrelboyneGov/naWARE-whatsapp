import type { Actor, DecideRelationInput, ReviewDecision } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { conflict, notFound, validation } from "../shared/result";
import type { ReviewDeps } from "./deps";
import { buildDecision, loadEventForDecision, requireModerator, staleAfterWrite } from "./support";

/**
 * link / merge / split between `eventId` and `otherEventId`.
 * - link: records the relation on both events, changes nothing else.
 * - merge: `eventId` is merged INTO `otherEventId`. The merged row stays (publicationStatus
 *   "merged" + mergedIntoEventId); its evidence is not moved.
 * - split: the listed evidence (which must belong to `eventId`) is re-attached to `otherEventId`.
 * A decision is recorded on both events.
 */
export async function decideRelation(
  deps: ReviewDeps,
  input: DecideRelationInput,
  actor?: Actor,
): Promise<UseCaseResult<ReviewDecision>> {
  const denied = requireModerator(actor);
  if (denied) return denied;

  if (input.otherEventId === input.eventId) {
    return validation("otherEventId", "An event cannot relate to itself");
  }

  const loaded = await loadEventForDecision(deps, input.eventId, input.versionSeq);
  if (loaded.error) return loaded;
  const event = loaded.data;

  const other = await deps.events.findById(input.otherEventId);
  if (!other) return notFound("event", input.otherEventId);
  if (other.publicationStatus === "merged") {
    return conflict("The other event was already merged into another one");
  }

  if (input.decision === "split") {
    if (input.evidenceIds.length === 0) {
      return validation("evidenceIds", "Choose the evidence to move");
    }
    for (const id of input.evidenceIds) {
      const evidence = await deps.evidence.findById(id);
      if (!evidence || evidence.eventId !== event.id) {
        return validation("evidenceIds", `Evidence ${id} does not belong to this event`);
      }
    }
  }

  const now = deps.clock.now();

  if (input.decision === "merge") {
    const saved = await deps.events.updateStatus(event.id, input.versionSeq, {
      publicationStatus: "merged",
      mergedIntoEventId: other.id,
      lastUpdatedAt: now,
    });
    if (!saved) return staleAfterWrite(deps, event.id, input.versionSeq);
    await deps.review.dequeue(event.id);
  }

  if (input.decision === "split") {
    for (const id of input.evidenceIds) {
      await deps.evidence.update(id, { eventId: other.id });
    }
  }

  const details = {
    relation: input.decision,
    eventId: event.id,
    otherEventId: other.id,
    evidenceIds: input.evidenceIds,
  };
  const decision = buildDecision(deps, {
    eventId: event.id,
    versionSeq: input.versionSeq,
    kind: "relation",
    decision: input.decision,
    actorId: actor!.userId,
    publicReason: input.publicReason,
    privateNote: input.privateNote,
    details,
  });
  await deps.review.recordDecision(decision);
  await deps.review.recordDecision(
    buildDecision(deps, {
      eventId: other.id,
      versionSeq: other.currentVersion.seq,
      kind: "relation",
      decision: input.decision,
      actorId: actor!.userId,
      publicReason: input.publicReason,
      privateNote: input.privateNote,
      details,
    }),
  );
  return ok(decision);
}
