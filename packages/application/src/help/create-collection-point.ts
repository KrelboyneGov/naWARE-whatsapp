import type {
  Actor,
  CollectionPoint,
  CreateCollectionPointInput,
} from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { notFound, validation } from "../shared/result";
import type { HelpDeps } from "./deps";
import { requireOrganizationAccess } from "./support";

export async function createCollectionPoint(
  deps: HelpDeps,
  input: CreateCollectionPointInput,
  actor?: Actor,
): Promise<UseCaseResult<CollectionPoint>> {
  const denied = requireOrganizationAccess(actor, input.organizationId);
  if (denied) return denied;
  const org = await deps.organizations.findById(input.organizationId);
  if (!org) return notFound("organization", input.organizationId);
  if (input.accepts.length === 0) return validation("accepts", "Say what the point accepts");

  return ok(
    await deps.collectionPoints.create({
      ...input,
      id: deps.ids.next("cp"),
      status: "active",
      isDemo: false,
      updatedAt: deps.clock.now(),
    }),
  );
}
