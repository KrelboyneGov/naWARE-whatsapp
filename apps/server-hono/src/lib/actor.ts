import { os, ORPCError } from "@orpc/server";
import { USER_ROLES, type UserRole } from "@emergency-map/domain/constants";
import type { Actor } from "@emergency-map/domain/schemas";
import { auth } from "./auth";
import { repositories } from "./container";

/**
 * oRPC context. The actor is resolved lazily and at most once per request, so public reads
 * never pay for a session lookup or an organization query.
 */
export interface AppContext {
  headers: Headers;
  getActor: () => Promise<Actor | null>;
}

const ROLE_RANK: Record<UserRole, number> = { user: 0, moderator: 1, admin: 2 };

function toRole(value: unknown): UserRole {
  return USER_ROLES.find((role) => role === value) ?? "user";
}

/** Session cookie -> Actor. Returns null for visitors. The role never comes from client input. */
export async function resolveActor(headers: Headers): Promise<Actor | null> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;

  const user = session.user as { id: string; name: string; role?: string | null };
  const organizationIds = await repositories.organizations.listOrganizationIdsForUser(user.id);

  return {
    userId: user.id,
    role: toRole(user.role),
    organizationIds,
    publicName: user.name,
  };
}

export function createContext(headers: Headers): AppContext {
  let pending: Promise<Actor | null> | undefined;
  return {
    headers,
    getActor: () => (pending ??= resolveActor(headers)),
  };
}

/** Adds `actor` to the context or answers 401. */
export const requireActor = os.$context<AppContext>().middleware(async ({ context, next }) => {
  const actor = await context.getActor();
  if (!actor) throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
  return next({ context: { actor } });
});

/** Adds `actor` to the context or answers 401/403 when the role is below `minimum`. */
export const requireRole = (minimum: UserRole) =>
  os.$context<AppContext>().middleware(async ({ context, next }) => {
    const actor = await context.getActor();
    if (!actor) throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
    if (ROLE_RANK[actor.role] < ROLE_RANK[minimum]) {
      throw new ORPCError("FORBIDDEN", { message: `The ${minimum} role is required` });
    }
    return next({ context: { actor } });
  });

/** For public reads that return more to a signed-in actor: never throws. */
export const optionalActor = os.$context<AppContext>().middleware(async ({ context, next }) => {
  return next({ context: { actor: await context.getActor() } });
});
