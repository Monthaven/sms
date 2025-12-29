/**
 * PROPRIETARY ƒ?" Always Improving LLC
 * Copyright Ac 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement A8.3.
 */

import type { JWTPayload } from "jose";

import type { PortalSession } from "@/lib/auth/get-session";
import { can as canWithRoles, permissionsForRoles } from "@/packages/security/roles";

function normalizeStringList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function extractRolesFromClaims(claims: JWTPayload | undefined) {
  if (!claims) return [];
  const direct = normalizeStringList((claims as Record<string, unknown>).roles);
  const role = typeof claims.role === "string" ? claims.role : null;
  return role ? Array.from(new Set([role, ...direct])) : Array.from(new Set(direct));
}

export function rolesFromSession(session: PortalSession | null | undefined) {
  if (!session) return [];
  const roles = new Set<string>();

  if (session.role) {
    roles.add(session.role);
  }

  for (const role of extractRolesFromClaims(session.claims)) {
    roles.add(role);
  }

  return Array.from(roles);
}

export function can(session: PortalSession | null | undefined, permission: string) {
  return canWithRoles(rolesFromSession(session), permission);
}

export function permissions(session: PortalSession | null | undefined) {
  return permissionsForRoles(rolesFromSession(session));
}
