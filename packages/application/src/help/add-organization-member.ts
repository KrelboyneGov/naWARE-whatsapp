import type { OrganizationMemberRole } from "@emergency-map/domain/constants";
import type { Actor } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { notFound } from "../shared/result";
import type { HelpDeps } from "./deps";
import { requireOrganizationAccess } from "./support";

export type AddOrganizationMemberInput = {
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
};

export async function addOrganizationMember(
  deps: Pick<HelpDeps, "organizations">,
  input: AddOrganizationMemberInput,
  actor?: Actor,
): Promise<UseCaseResult<AddOrganizationMemberInput>> {
  const denied = requireOrganizationAccess(actor, input.organizationId);
  if (denied) return denied;
  const org = await deps.organizations.findById(input.organizationId);
  if (!org) return notFound("organization", input.organizationId);
  await deps.organizations.addMember(input);
  return ok(input);
}
