import type { Actor, PublicEvidence } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import { canViewEvent } from "../events/visibility";
import { isModerator } from "../shared/authz";
import { toPublicEvidence } from "../shared/public";
import type { UseCaseResult } from "../shared/result";
import { notFound } from "../shared/result";
import type { EvidenceDeps } from "./deps";

/** Public evidence only; moderators also see pending and restricted items. Never the author id. */
export async function listEvidenceForEvent(
  deps: Pick<EvidenceDeps, "events" | "evidence">,
  input: { eventId: string },
  actor?: Actor,
): Promise<UseCaseResult<PublicEvidence[]>> {
  const event = await deps.events.findById(input.eventId);
  if (!event || !canViewEvent(event, actor)) return notFound("event", input.eventId);
  const items = await deps.evidence.listByEvent(event.id, { includeNonPublic: isModerator(actor) });
  return ok(items.map(toPublicEvidence));
}
