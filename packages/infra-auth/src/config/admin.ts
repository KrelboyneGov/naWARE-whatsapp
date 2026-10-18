import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";

/**
 * Global roles (ADR 0005): user, moderator, admin. The role names mirror USER_ROLES in the
 * domain. Moderators get the same plugin permissions as plain users: review rights are checked
 * by the use cases from the Actor, not by the plugin's permission matrix.
 */
const ac = createAccessControl(defaultStatements);

export const adminPlugin = admin({
  ac,
  roles: {
    user: ac.newRole(userAc.statements),
    moderator: ac.newRole(userAc.statements),
    admin: ac.newRole(adminAc.statements),
  },
  defaultRole: "user",
  adminRoles: ["admin"],
});
