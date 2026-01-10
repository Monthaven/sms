/**
 * PROPRIETARY — Always Improving LLC
 * Agent Status API - Update agent online/break status
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";
import { z } from "zod";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusSchema = z.object({
  status: z.enum(["ONLINE", "ON_BREAK", "OFFLINE", "WRAPPING"]),
  breakReason: z.string().optional(),
});

/**
 * GET - Get current agent status
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      isOnline: true,
      status: true,
      statusSince: true,
      breakReason: true,
      currentCallId: true,
      lastActiveAt: true,
      shiftStart: true,
      shiftEnd: true,
    },
  });

  return NextResponse.json({ agent });
}

/**
 * PUT - Update agent status
 */
export async function PUT(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/agent/status", requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { status, breakReason } = parsed.data;
    const now = new Date();

    // Get current status for logging
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { status: true, statusSince: true },
    });

    // Calculate duration of previous status
    let previousDuration = 0;
    if (current?.statusSince) {
      previousDuration = Math.floor(
        (now.getTime() - new Date(current.statusSince).getTime()) / 1000
      );
    }

    // Update user status
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        status,
        statusSince: now,
        isOnline: status !== "OFFLINE",
        lastActiveAt: now,
        breakReason: status === "ON_BREAK" ? breakReason || null : null,
      },
      select: {
        id: true,
        status: true,
        statusSince: true,
        isOnline: true,
        breakReason: true,
      },
    });

    // Log status change for reporting
    await prisma.agentStatusLog.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        status,
        reason: breakReason || (previousDuration ? `Duration: ${previousDuration}s` : null),
      },
    });

    log.info("Agent status changed", { 
      userId: user.id, 
      from: current?.status,
      to: status,
      duration: previousDuration,
    });

    return NextResponse.json({ agent: updated });

  } catch (error: any) {
    log.error("Failed to update status", { error: error.message });
    return NextResponse.json({ error: "Status update failed" }, { status: 500 });
  }
}

/**
 * POST - Heartbeat to keep agent marked as active
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastActiveAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
