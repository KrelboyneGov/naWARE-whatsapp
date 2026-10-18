import type { Actor } from "@emergency-map/domain/schemas";

export function isModerator(actor: Actor | undefined): boolean {
  return actor !== undefined && (actor.role === "moderator" || actor.role === "admin");
}

export function isAdmin(actor: Actor | undefined): boolean {
  return actor !== undefined && actor.role === "admin";
}

/** Organization write access: admin, or a member of that organization (ADR 0005). */
export function canWriteForOrganization(actor: Actor, organizationId: string): boolean {
  return actor.role === "admin" || actor.organizationIds.includes(organizationId);
}
