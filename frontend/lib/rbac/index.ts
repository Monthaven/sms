/**
 * SMS RBAC - Stack Auth Teams Integration
 * Extracts roles from Stack Auth JWT teams claim
 */
import { cookies as nextCookies } from "next/headers";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { can as canWithRoles, permissionsForRoles, rolePermissions } from "@/packages/security/roles";

// JWKS resolver for Stack Auth JWT verification
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function resolveJwks() {
  if (!jwks) {
    const jwksUrl = process.env.STACK_AUTH_JWKS_URL ?? process.env.STACK_JWKS_URL;
    if (!jwksUrl) {
      throw new Error("Missing STACK_AUTH_JWKS_URL");
    }
    jwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return jwks;
}

/**
 * Get roles from cookies (reads Stack Auth session)
 * Returns roles, membership status, and permission helpers
 */
export async function getRolesFromCookies(cookieStore?: any) {
  const cookies = cookieStore ?? (await nextCookies());
  const sessionToken = cookies.get("stack_session")?.value;

  if (!sessionToken) {
    return {
      roles: [],
      membership: "pending",
      emailDisplay: "Not authenticated",
      can: () => false,
      permissions: new Set(),
    };
  }

  try {
    const { payload } = await jwtVerify(sessionToken, resolveJwks(), {
      algorithms: ["RS256"],
    });

    // Extract teams from Stack JWT
    const teams = (payload.teams as any[]) || [];
    const roles = teams.map((t) => t.name.toLowerCase());

    const emailDisplay = (payload.email as string) || "Authenticated user";
    const membership = (payload.membership_status as string) || "accepted";

    return {
      roles,
      membership,
      emailDisplay,
      can: (perm: string) => canWithRoles(roles, perm),
      permissions: permissionsForRoles(roles),
    };
  } catch (error) {
    console.error("[rbac] Failed to verify Stack JWT:", error);
    return {
      roles: [],
      membership: "pending",
      emailDisplay: "Invalid session",
      can: () => false,
      permissions: new Set(),
    };
  }
}

export { rolePermissions };

/**
 * Extract roles from session object (Stack Auth JWT claims)
 */
export function rolesFromSession(session: { role?: string; claims?: any } | null | undefined) {
  if (!session) return [];
  const roles = new Set<string>();

  // Extract from Stack teams claim
  const teams = (session.claims?.teams as any[]) || [];
  teams.forEach((t) => {
    if (t.name) roles.add(t.name.toLowerCase());
  });

  // Fallback: check for direct role claim
  if (typeof session.role === "string") {
    roles.add(session.role.toLowerCase());
  }

  // Additional fallback: roles array claim
  const claimRoles: unknown = session.claims?.roles;
  if (Array.isArray(claimRoles)) {
    claimRoles.forEach((r) => {
      if (typeof r === "string" && r.trim()) roles.add(r.trim().toLowerCase());
    });
  }

  return Array.from(roles);
}
