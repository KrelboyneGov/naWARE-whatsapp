import type { Actor, CreateOrganizationInput, Organization } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { unauthenticated, validation } from "../shared/result";
import type { HelpDeps } from "./deps";

/** Creates an organization pending review and makes the creator its owner. */
export async function createOrganization(
  deps: HelpDeps,
  input: CreateOrganizationInput,
  actor?: Actor,
): Promise<UseCaseResult<Organization>> {
  if (!actor) return unauthenticated();
  const name = input.name.trim();
  if (name.length === 0) return validation("name", "Name is required");

  const org = await deps.organizations.create({
    id: deps.ids.next("org"),
    name,
    description: input.description,
    coverage: input.coverage,
    contacts: input.contacts,
    identityReview: "pending",
    identityReviewedAt: null,
    contactReview: "pending",
    contactReviewedAt: null,
    isDemo: false,
    createdAt: deps.clock.now(),
  });
  await deps.organizations.addMember({
    organizationId: org.id,
    userId: actor.userId,
    role: "owner",
  });
  return ok(org);
}
