/** Global roles stored by the Better Auth admin plugin. Visitors have no account. */
export const USER_ROLES = ["user", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles inside an organization (our own table, see ADR 0005). */
export const ORGANIZATION_MEMBER_ROLES = ["owner", "editor"] as const;
export type OrganizationMemberRole = (typeof ORGANIZATION_MEMBER_ROLES)[number];
