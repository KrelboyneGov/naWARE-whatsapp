import type { ReviewStatus } from "@emergency-map/domain/constants";
import type {
  Actor,
  DecideCorroborationInput,
  ReviewDecision,
} from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { notFound, validation } from "../shared/result";
import type { ReviewDeps } from "./deps";
import { buildDecision, loadEventForDecision, requireModerator, staleAfterWrite } from "./support";

/**
 * Decides on the facts. Corroboration and official backing must state what was checked and what
 * stays uncertain; "with_contributions" only records that independent contributions exist.
 */
export async function decideCorroboration(
  deps: ReviewDeps,
  input: DecideCorroborationInput,
  actor?: Actor,
): Promise<UseCaseResult<ReviewDecision>> {
  const denied = requireModerator(actor);
  if (denied) return denied;

  const loaded = await loadEventForDecision(deps, input.eventId, input.versionSeq);
  if (loaded.error) return loaded;
  const event = loaded.data;

  const aspects = input.aspectsChecked.map((a) => a.trim()).filter((a) => a.length > 0);
  const limits = input.limits?.trim() ?? "";
  const needsAspects =
    input.decision === "corroborate_aspects" || input.decision === "link_official_backing";
  if (needsAspects) {
    if (aspects.length === 0) {
      return validation("aspectsChecked", "State what was checked");
    }
    if (limits.length === 0) {
      return validation("limits", "State what remains uncertain");
    }
  }

  if (input.decision === "link_official_backing") {
    if (!input.officialNoticeId) {
      return validation("officialNoticeId", "An official notice is required");
    }
    const notice = await deps.notices.findById(input.officialNoticeId);
    if (!notice) return notFound("official_notice", input.officialNoticeId);
  }

  for (const evidenceId of input.citedEvidenceIds) {
    const evidence = await deps.evidence.findById(evidenceId);
    if (!evidence || evidence.eventId !== event.id) {
      return validation("citedEvidenceIds", `Evidence ${evidenceId} does not belong to this event`);
    }
  }

  let contributionCount = event.contributionCount;
  if (input.decision === "record_contributions") {
    contributionCount = await deps.evidence.countIndependent(event.id);
    if (contributionCount < 1) {
      return validation("decision", "No independent public contributions to record");
    }
  }

  const nextStatus: Record<DecideCorroborationInput["decision"], ReviewStatus> = {
    keep_unverified: event.reviewStatus,
    record_contributions: "with_contributions",
    corroborate_aspects: "corroborated_by_review",
    link_official_backing: "officially_backed",
    mark_disputed: "disputed",
  };
  const to = nextStatus[input.decision];

  if (to !== event.reviewStatus || contributionCount !== event.contributionCount) {
    const saved = await deps.events.updateStatus(event.id, input.versionSeq, {
      reviewStatus: to,
      contributionCount,
    });
    if (!saved) return staleAfterWrite(deps, event.id, input.versionSeq);
  }

  const now = deps.clock.now();
  if (input.decision === "mark_disputed") {
    await deps.review.enqueue({
      eventId: event.id,
      reason: "disputed",
      versionSeq: input.versionSeq,
      at: now,
    });
  }

  const decision = buildDecision(deps, {
    eventId: event.id,
    versionSeq: input.versionSeq,
    kind: "corroboration",
    decision: input.decision,
    actorId: actor!.userId,
    publicReason: input.publicReason,
    privateNote: input.privateNote,
    details: {
      from: event.reviewStatus,
      to,
      aspectsChecked: aspects,
      limits: limits || null,
      citedEvidenceIds: input.citedEvidenceIds,
      officialNoticeId: input.officialNoticeId,
    },
  });
  await deps.review.recordDecision(decision);
  return ok(decision);
}
