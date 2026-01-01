/**
 * Minimal session reader for frontdoor portal pages.
 */
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export type PortalSession = {
  claims: Record<string, unknown>;
  role?: string;
  membershipStatus?: string;
  userId?: string;
};

export async function getSessionFromCookies(): Promise<PortalSession | null> {
  const store = await cookies();
  const user = store.get("mae_user")?.value;
  const role = store.get("mae_role")?.value;
  const membership = store.get("mae_membership")?.value ?? store.get("mae_status")?.value;

  if (!user) return null;

  const claims: Record<string, unknown> = { sub: user };
  if (user) claims.email = user;
  if (role) claims.role = role;

  return {
    claims,
    role: role || undefined,
    membershipStatus: membership || undefined,
    userId: user,
  };
}

export async function getSessionFromRequest(req: NextRequest): Promise<PortalSession | null> {
  const user = req.cookies.get("mae_user")?.value;
  const role = req.cookies.get("mae_role")?.value;
  const membership = req.cookies.get("mae_membership")?.value ?? req.cookies.get("mae_status")?.value;
  if (!user) return null;
  const claims: Record<string, unknown> = { sub: user, email: user };
  if (role) claims.role = role;
  return {
    claims,
    role: role || undefined,
    membershipStatus: membership || undefined,
    userId: user,
  };
}
