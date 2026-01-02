/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !["ADMIN", "MANAGER"].includes(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active calls (in-progress status)
    const activeCalls = await db.call.findMany({
      where: {
        status: { in: ["in-progress", "ringing", "queued"] },
        endedAt: null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true, phoneE164: true },
        },
        lead: {
          select: { id: true, status: true },
          include: {
            property: {
              select: { addressLine1: true, city: true, state: true },
            },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    // Calculate duration for each call
    const now = new Date();
    const callsWithDuration = activeCalls.map((call) => ({
      ...call,
      currentDuration: Math.floor((now.getTime() - call.startedAt.getTime()) / 1000),
    }));

    return NextResponse.json({
      calls: callsWithDuration,
      total: callsWithDuration.length,
    });
  } catch (error) {
    const requestId = generateRequestId();
    logger.error("Live calls error", { requestId }, error as Error);
    return NextResponse.json({ error: "Failed to fetch live calls", requestId }, { status: 500 });
  }
}
