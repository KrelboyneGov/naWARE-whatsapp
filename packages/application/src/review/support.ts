import type { Actor, Event, ReviewDecision } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import { isModerator } from "../shared/authz";
import {
  forbidden,
  invalidTransition,
  notFound,
  staleVersion,
  unauthenticated,
  type UseCaseResult,
} from "../shared/result";
import type { ReviewDeps } from "./deps";

/** Moderator or admin gate shared by every review use case. */
export function requireModerator(actor: Actor | undefined) {
  if (!actor) return unauthenticated();
  if (!isModerator(actor)) return forbidden("Moderator or admin role required");
  return null;
}

/**
 * Loads the event a decision targets and rejects a decision made on an old version
 * (ADR 0004, failure 4). Merged events are closed to further decisions.
 */
export async function loadEventForDecision(
  deps: Pick<ReviewDeps, "events">,
  eventId: string,
  versionSeq: number,
): Promise<UseCaseResult<Event>> {
  const event = await deps.events.findById(eventId);
  if (!event) return notFound("event", eventId);
  if (versionSeq !== event.currentVersion.seq) {
    return staleVersion(event.currentVersion.seq, versionSeq);
  }
  if (event.publicationStatus === "merged") {
    return invalidTransition("merged", "any");
  }
  return ok(event);
}

export function buildDecision(
  deps: Pick<ReviewDeps, "clock" | "ids">,
  d: Omit<ReviewDecision, "id" | "decidedAt">,
): ReviewDecision {
  return { ...d, id: deps.ids.next("dec"), decidedAt: deps.clock.now() };
}

/** Result of a guarded status write that lost the race against a newer version. */
export async function staleAfterWrite(
  deps: Pick<ReviewDeps, "events">,
  eventId: string,
  attemptedSeq: number,
) {
  const fresh = await deps.events.findById(eventId);
  return staleVersion(fresh?.currentVersion.seq ?? attemptedSeq, attemptedSeq);
}
