/**
 * Lightweight RBAC helpers using the role → permission map.
 */
import { cookies as nextCookies, type ReadonlyRequestCookies } from "next/headers";
import { can as canWithRoles, permissionsForRoles, rolePermissions } from "@/packages/security/roles";

export function getRolesFromCookies(cookieStore?: ReadonlyRequestCookies | ReturnType<typeof nextCookies>) {
  const cookies = cookieStore ?? nextCookies();
  const roleCookie = cookies.get("mae_role")?.value ?? "";
  const roles = roleCookie
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  const membership = cookies.get("mae_membership")?.value ?? cookies.get("mae_status")?.value ?? "accepted";
  const emailDisplay = cookies.get("mae_user")?.value ?? "Authenticated user";

  return {
    roles,
    membership,
    emailDisplay,
    can: (perm: string) => canWithRoles(roles, perm),
    permissions: permissionsForRoles(roles),
  };
}

export { rolePermissions };
