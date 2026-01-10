/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 *
 * UNIFIED AUTH - Stack Auth Integration
 * Replaces custom cookie-based auth with Stack Auth JWT verification
 */

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { z } from "zod";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

const SESSION_COOKIE_NAME = "stack_session";

// JWKS resolver for Stack Auth JWT verification
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function resolveJwks() {
  if (!jwks) {
    const jwksUrl = process.env.STACK_AUTH_JWKS_URL ?? process.env.STACK_JWKS_URL;
    if (!jwksUrl) {
      throw new Error("Missing STACK_AUTH_JWKS_URL for session validation.");
    }
    jwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return jwks;
}

// JWT claims schema validation
const sessionClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
});

/**
 * Verify Stack Auth JWT token
 */
async function verifyStackJwt(token: string): Promise<JWTPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, resolveJwks(), {
      algorithms: ["RS256"],
    });

    const parsed = sessionClaimsSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("[auth] Invalid JWT claims.", parsed.error.flatten());
      return null;
    }

    return payload;
  } catch (error) {
    console.error("[auth] Failed to verify Stack JWT.", error);
    return null;
  }
}

/**
 * Get the current authenticated user
 *
 * CRITICAL: This function maintains the same interface as the old custom auth
 * All 73+ API routes depend on this returning CurrentUser | null
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  // Verify Stack JWT
  const claims = await verifyStackJwt(sessionToken);
  if (!claims || !claims.email) {
    return null;
  }

  // Extract Stack user ID from JWT
  const stackUserId = claims.sub as string;

  // Look up user in database by Stack user ID
  let user = await prisma.user.findFirst({
    where: { stackUserId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      stackUserId: true,
    },
  });

  // Fallback: lookup by email (for users mid-migration or not yet linked)
  if (!user) {
    user = await prisma.user.findUnique({
      where: { email: claims.email as string },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        stackUserId: true,
      },
    });

    // Auto-link stackUserId if found by email but not yet linked
    if (user && !user.stackUserId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stackUserId },
      });
      console.log(`[auth] Auto-linked user ${user.email} to Stack Auth (stackUserId: ${stackUserId})`);
    }
  }

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
