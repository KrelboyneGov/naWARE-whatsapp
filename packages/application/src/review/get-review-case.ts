import type {
  Actor,
  Evidence,
  EventVersion,
  PublicEvent,
  ReviewDecision,
} from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import { toPublicEvent } from "../shared/public";
import type { UseCaseResult } from "../shared/result";
import { notFound } from "../shared/result";
import type { ReviewDeps } from "./deps";
import { requireModerator } from "./support";

export type ReviewCase = {
  event: PublicEvent;
  versions: EventVersion[];
  /** All evidence, including pending and restricted items. */
  evidence: Evidence[];
  /** Full decisions, including private notes. */
  decisions: ReviewDecision[];
};

export async function getReviewCase(
  deps: Pick<ReviewDeps, "events" | "evidence" | "review">,
  input: { eventId: string },
  actor?: Actor,
): Promise<UseCaseResult<ReviewCase>> {
  const denied = requireModerator(actor);
  if (denied) return denied;
  const event = await deps.events.findById(input.eventId);
  if (!event) return notFound("event", input.eventId);
  const [versions, evidence, decisions] = await Promise.all([
    deps.events.listVersions(event.id),
    deps.evidence.listByEvent(event.id, { includeNonPublic: true }),
    deps.review.listDecisions(event.id),
  ]);
  return ok({ event: toPublicEvent(event), versions, evidence, decisions });
}
