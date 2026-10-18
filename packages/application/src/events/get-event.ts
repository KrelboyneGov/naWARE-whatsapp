import type {
  Actor,
  PublicEvent,
  PublicEvidence,
  PublicReviewDecision,
} from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import { isModerator } from "../shared/authz";
import { toPublicDecision, toPublicEvent, toPublicEvidence } from "../shared/public";
import type { UseCaseResult } from "../shared/result";
import { notFound } from "../shared/result";
import type { EventsDeps } from "./deps";
import { canViewEvent } from "./visibility";

export type EventDetail = {
  event: PublicEvent;
  evidence: PublicEvidence[];
  decisions: PublicReviewDecision[];
  /** Set on a merged event so the client can redirect to the main one. */
  mergedIntoEventId: string | null;
};

/** Public read model plus public evidence and public decisions. Never exposes private data. */
export async function getEvent(
  deps: Pick<EventsDeps, "events" | "evidence" | "review">,
  input: { eventId: string },
  actor?: Actor,
): Promise<UseCaseResult<EventDetail>> {
  const event = await deps.events.findById(input.eventId);
  if (!event || !canViewEvent(event, actor)) return notFound("event", input.eventId);

  if (event.publicationStatus === "merged") {
    return ok({
      event: toPublicEvent(event),
      evidence: [],
      decisions: [],
      mergedIntoEventId: event.mergedIntoEventId,
    });
  }

  const [evidence, decisions] = await Promise.all([
    deps.evidence.listByEvent(event.id, { includeNonPublic: isModerator(actor) }),
    deps.review.listDecisions(event.id),
  ]);

  return ok({
    event: toPublicEvent(event),
    evidence: evidence.map(toPublicEvidence),
    decisions: decisions.map(toPublicDecision),
    mergedIntoEventId: null,
  });
}
