import type { Actor, CreateNeedInput, Need } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { notFound, validation } from "../shared/result";
import type { HelpDeps } from "./deps";
import { requireOrganizationAccess } from "./support";

export async function createNeed(
  deps: HelpDeps,
  input: CreateNeedInput,
  actor?: Actor,
): Promise<UseCaseResult<Need>> {
  const denied = requireOrganizationAccess(actor, input.organizationId);
  if (denied) return denied;

  const org = await deps.organizations.findById(input.organizationId);
  if (!org) return notFound("organization", input.organizationId);

  const now = deps.clock.now();
  if (input.deadline && input.deadline <= now) {
    return validation("deadline", "The deadline must be in the future");
  }
  if (input.collectionPointId) {
    const point = await deps.collectionPoints.findById(input.collectionPointId);
    if (!point || point.organizationId !== org.id) {
      return validation("collectionPointId", "Collection point not found in this organization");
    }
  }

  return ok(
    await deps.needs.create({
      ...input,
      id: deps.ids.next("need"),
      status: "open",
      statusNote: null,
      isDemo: false,
      updatedAt: now,
    }),
  );
}
