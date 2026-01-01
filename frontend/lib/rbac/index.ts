/**
 * Lightweight RBAC helpers using the role → permission map.
 */
import { cookies as nextCookies } from "next/headers";
import { can as canWithRoles, permissionsForRoles, rolePermissions } from "@/packages/security/roles";

export function getRolesFromCookies(cookieStore?: any) {
  const cookies = cookieStore ?? nextCookies();
  const roleCookie = cookies.get("mae_role")?.value ?? "";
  const roles = roleCookie
    .split(",")
    .map((r: string) => r.trim().toLowerCase())
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

export function rolesFromSession(session: { role?: string; claims?: any } | null | undefined) {
  if (!session) return [];
  const roles = new Set<string>();
  if (typeof session.role === "string") {
    roles.add(session.role);
  }
  const claims = session.claims as any;
  const claimRoles: unknown = claims?.roles;
  if (Array.isArray(claimRoles)) {
    claimRoles.forEach((r) => {
      if (typeof r === "string" && r.trim()) roles.add(r.trim().toLowerCase());
    });
  } else if (typeof claimRoles === "string" && claimRoles.trim()) {
    claimRoles
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean)
      .forEach((r) => roles.add(r));
  }
  if (typeof claims?.role === "string" && claims.role.trim()) {
    roles.add(claims.role.trim().toLowerCase());
  }
  return Array.from(roles);
}
