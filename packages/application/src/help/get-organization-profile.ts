import type { CollectionPoint, Need, Organization } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { notFound } from "../shared/result";
import type { HelpDeps } from "./deps";
import { effectiveNeed, isActiveNeed } from "./support";

export type OrganizationProfile = {
  organization: Organization;
  /** Active needs only. */
  needs: Need[];
  collectionPoints: CollectionPoint[];
};

export async function getOrganizationProfile(
  deps: HelpDeps,
  input: { organizationId: string },
): Promise<UseCaseResult<OrganizationProfile>> {
  const organization = await deps.organizations.findById(input.organizationId);
  if (!organization) return notFound("organization", input.organizationId);
  const now = deps.clock.now();
  const [needs, points] = await Promise.all([
    deps.needs.list({ organizationId: organization.id, onlyActive: true }, now),
    deps.collectionPoints.list({ organizationId: organization.id }),
  ]);
  return ok({
    organization,
    needs: needs.map((n) => effectiveNeed(n, now)).filter(isActiveNeed),
    collectionPoints: points.map((p) => p.point).filter((p) => p.status !== "withdrawn"),
  });
}
