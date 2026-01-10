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
        User: {
          select: { id: true, name: true, email: true },
        },
        Contact: {
          select: { id: true, firstName: true, lastName: true, phoneE164: true },
        },
        Lead: {
          select: {
            id: true,
            status: true,
            Property: {
              select: { addressLine1: true, city: true, state: true },
            },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    // Calculate duration for each call
    const now = new Date();
    const callsWithDuration = activeCalls.map((call) => {
      const { User, Contact, Lead, ...rest } = call;
      const { Property, ...leadRest } = Lead ?? {};
      return {
        ...rest,
        user: User,
        contact: Contact,
        lead: Lead ? { ...leadRest, property: Property } : null,
        currentDuration: Math.floor((now.getTime() - call.startedAt.getTime()) / 1000),
      };
    });

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
