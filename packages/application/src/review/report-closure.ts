import type { Actor, ReportClosureInput, ReviewDecision } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { invalidTransition, validation } from "../shared/result";
import type { ReviewDeps } from "./deps";
import { buildDecision, loadEventForDecision, requireModerator, staleAfterWrite } from "./support";

/**
 * Marks an event as "closure reported". A closure needs a source; elapsed time alone never
 * closes anything (situation is independent from validity and from time).
 */
export async function reportClosure(
  deps: ReviewDeps,
  input: ReportClosureInput,
  actor?: Actor,
): Promise<UseCaseResult<ReviewDecision>> {
  const denied = requireModerator(actor);
  if (denied) return denied;

  const description = input.sourceDescription.trim();
  if (description.length === 0 && !input.sourceUrl) {
    return validation("sourceDescription", "A closure needs a source");
  }

  const loaded = await loadEventForDecision(deps, input.eventId, input.versionSeq);
  if (loaded.error) return loaded;
  const event = loaded.data;
  if (event.situationStatus === "closure_reported") {
    return invalidTransition("closure_reported", "closure_reported");
  }

  const now = deps.clock.now();
  const saved = await deps.events.updateStatus(event.id, input.versionSeq, {
    situationStatus: "closure_reported",
    lastUpdatedAt: now,
  });
  if (!saved) return staleAfterWrite(deps, event.id, input.versionSeq);

  const decision = buildDecision(deps, {
    eventId: event.id,
    versionSeq: input.versionSeq,
    kind: "closure",
    decision: "closure_reported",
    actorId: actor!.userId,
    publicReason: input.publicReason,
    privateNote: input.privateNote,
    details: { sourceUrl: input.sourceUrl, sourceDescription: description },
  });
  await deps.review.recordDecision(decision);

  if (event.publicationStatus === "published") {
    await deps.events.appendActivity({
      id: deps.ids.next("act"),
      eventId: event.id,
      eventTitle: event.currentVersion.title,
      type: "closure",
      actorRole: "moderator",
      summary: `Closure reported: ${event.currentVersion.title}`,
      at: now,
      isDemo: false,
    });
  }
  return ok(decision);
}
