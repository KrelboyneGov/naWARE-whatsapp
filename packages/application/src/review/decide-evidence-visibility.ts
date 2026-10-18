import type { EvidenceVisibility } from "@emergency-map/domain/constants";
import type { Actor } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { notFound } from "../shared/result";
import type { ReviewDeps } from "./deps";
import { requireModerator } from "./support";

/**
 * Makes one evidence item public, restricted or removed, then refreshes the event's count of
 * independent contributions. It never touches the event's review status.
 */
export async function decideEvidenceVisibility(
  deps: Pick<ReviewDeps, "events" | "evidence">,
  input: { evidenceId: string; visibility: EvidenceVisibility },
  actor?: Actor,
): Promise<UseCaseResult<{ evidenceId: string; contributionCount: number }>> {
  const denied = requireModerator(actor);
  if (denied) return denied;
  const evidence = await deps.evidence.findById(input.evidenceId);
  if (!evidence) return notFound("evidence", input.evidenceId);
  const event = await deps.events.findById(evidence.eventId);
  if (!event) return notFound("event", evidence.eventId);

  await deps.evidence.update(evidence.id, { visibility: input.visibility });
  const contributionCount = await deps.evidence.countIndependent(event.id);
  await deps.events.updateStatus(event.id, event.currentVersion.seq, { contributionCount });
  return ok({ evidenceId: evidence.id, contributionCount });
}
