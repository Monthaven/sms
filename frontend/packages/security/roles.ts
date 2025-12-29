/**
 * Role → permission map for the portal.
 */
export const rolePermissions = {
  admin: ["*"],
  manager: ["sms:callers:manage", "sms:send", "sms:scripts:edit", "deals:view"],
  caller: ["sms:send"],
  dev: ["sms:send", "deals:view"],
  investor: ["investor:read", "deals:view"],
  lender: ["lender:calc", "investor:read"],
  vendor: ["vendor:view"],
  om_ops: ["om:view", "om:docs:view", "deals:view"],
  sms_ops: ["sms:send", "sms:scripts:edit"],
  deals_ops: ["deals:view", "deals:edit", "deals:loi", "deals:psa"],
} as const;

type Role = keyof typeof rolePermissions;
type Permission = (typeof rolePermissions)[Role][number] | "*";

function normalizeRole(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

export function permissionsForRoles(roles: string[] | undefined) {
  const perms = new Set<Permission>();
  for (const rawRole of roles ?? []) {
    const role = normalizeRole(rawRole) as Role | null;
    if (!role) continue;
    const list = rolePermissions[role];
    if (!list) continue;
    if (list.includes("*")) {
      perms.clear();
      perms.add("*");
      return perms;
    }
    list.forEach((p) => perms.add(p));
  }
  return perms;
}

export function can(roles: string[] | undefined, permission: string) {
  if (!roles?.length) return false;
  const perms = permissionsForRoles(roles);
  return perms.has("*") || perms.has(permission);
}
