/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  // Get all users who need contracts (CALLER, AGENT roles)
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["CALLER", "AGENT"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      contractSignedAt: true,
      contractEnvelopeId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Map to contract status format
  const contracts = users.map((user) => {
    let status: string = "PENDING";
    if (user.contractSignedAt) {
      status = "SIGNED";
    } else if (user.contractEnvelopeId) {
      status = "SENT";
    }

    return {
      id: user.id,
      userId: user.id,
      userName: user.name || "Unknown",
      userEmail: user.email || "",
      status,
      envelopeId: user.contractEnvelopeId,
      sentAt: user.contractEnvelopeId ? user.createdAt.toISOString() : null,
      signedAt: user.contractSignedAt?.toISOString() || null,
      expiresAt: null,
    };
  });

  return NextResponse.json({ contracts });
}
