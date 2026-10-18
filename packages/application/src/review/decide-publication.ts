import type { PublicationStatus } from "@emergency-map/domain/constants";
import type { Actor, DecidePublicationInput, ReviewDecision } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { invalidTransition } from "../shared/result";
import type { ReviewDeps } from "./deps";
import { buildDecision, loadEventForDecision, requireModerator, staleAfterWrite } from "./support";

/** decision -> allowed current publication statuses and the resulting one. */
const TRANSITIONS: Record<
  DecidePublicationInput["decision"],
  { from: PublicationStatus[]; to: PublicationStatus }
> = {
  publish: { from: ["pending_review", "hidden"], to: "published" },
  request_info: { from: ["pending_review"], to: "pending_review" },
  reject: { from: ["pending_review", "hidden"], to: "rejected" },
  withdraw: { from: ["published"], to: "hidden" },
};

/**
 * Changes visibility only. Publishing never touches reviewStatus: a published report is not a
 * corroborated one (failure 1).
 */
export async function decidePublication(
  deps: ReviewDeps,
  input: DecidePublicationInput,
  actor?: Actor,
): Promise<UseCaseResult<ReviewDecision>> {
  const denied = requireModerator(actor);
  if (denied) return denied;

  const loaded = await loadEventForDecision(deps, input.eventId, input.versionSeq);
  if (loaded.error) return loaded;
  const event = loaded.data;

  const rule = TRANSITIONS[input.decision];
  if (!rule.from.includes(event.publicationStatus)) {
    return invalidTransition(event.publicationStatus, rule.to);
  }

  const now = deps.clock.now();
  const changed = rule.to !== event.publicationStatus;
  if (changed) {
    const saved = await deps.events.updateStatus(event.id, input.versionSeq, {
      publicationStatus: rule.to,
      publishedAt: rule.to === "published" ? (event.publishedAt ?? now) : event.publishedAt,
      lastUpdatedAt: now,
    });
    if (!saved) return staleAfterWrite(deps, event.id, input.versionSeq);
  }

  if (input.decision === "publish" || input.decision === "reject") {
    await deps.review.dequeue(event.id);
  }

  const decision = buildDecision(deps, {
    eventId: event.id,
    versionSeq: input.versionSeq,
    kind: "publication",
    decision: input.decision,
    actorId: actor!.userId,
    publicReason: input.publicReason,
    privateNote: input.privateNote,
    details: { from: event.publicationStatus, to: rule.to },
  });
  await deps.review.recordDecision(decision);
  return ok(decision);
}
