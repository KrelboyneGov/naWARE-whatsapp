import type { Actor, Need } from "@emergency-map/domain/schemas";
import { canWriteForOrganization } from "../shared/authz";
import { forbidden, unauthenticated } from "../shared/result";

/** Null when the actor may write for the organization (member or admin), else the error. */
export function requireOrganizationAccess(actor: Actor | undefined, organizationId: string) {
  if (!actor) return unauthenticated();
  if (!canWriteForOrganization(actor, organizationId)) {
    return forbidden("Only members of the organization can change it");
  }
  return null;
}

/**
 * A need past its deadline is expired even if nobody updated its status (failure 8).
 * Covered and expired needs are never "active".
 */
export function effectiveNeed(need: Need, now: Date): Need {
  const pastDeadline = need.deadline !== null && need.deadline < now;
  if (pastDeadline && (need.status === "open" || need.status === "paused")) {
    return { ...need, status: "expired" };
  }
  return need;
}

export const isActiveNeed = (need: Need) => need.status === "open" || need.status === "paused";
