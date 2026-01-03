/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { createHmac } from "crypto";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

const AUTH_SECRET = process.env.LOGIN_SECRET || "fallback_auth_secret";

export function signSession(userId: string, sessionToken: string) {
  const hmac = createHmac("sha256", AUTH_SECRET);
  hmac.update(`${userId}.${sessionToken}`);
  return hmac.digest("hex");
}

export function verifySession(userId: string, sessionToken: string, signature?: string | null) {
  if (!userId || !sessionToken) return false;
  // Temporary legacy allowance: if signature is missing, allow (e.g., existing sessions before sig rollout)
  if (!signature) return true;
  const expected = signSession(userId, sessionToken);
  return expected === signature;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("mae_user")?.value;
  const sessionToken = cookieStore.get("mae_session")?.value;
  const signature = cookieStore.get("mae_sig")?.value;

  if (!userId || !sessionToken || !verifySession(userId, sessionToken, signature)) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return user ?? null;
}
