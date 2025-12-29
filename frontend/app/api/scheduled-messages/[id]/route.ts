/**
 * PROPRIETARY — Always Improving LLC
 * Scheduled Message by ID - Cancel/Update
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  content: z.string().min(1).max(1600).optional(),
  scheduledFor: z.string().datetime().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

/**
 * GET - Get scheduled message details
 */
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scheduled = await prisma.scheduledMessage.findUnique({
    where: { id },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneE164: true,
          timezone: true,
        },
      },
      user: {
        select: { name: true },
      },
    },
  });

  if (!scheduled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check access
  if (scheduled.userId !== user.id && !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ scheduled });
}

/**
 * PUT - Update scheduled message
 */
export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: `/api/scheduled-messages/${id}`, requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scheduled = await prisma.scheduledMessage.findUnique({
    where: { id },
  });

  if (!scheduled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (scheduled.userId !== user.id && !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Can only update pending messages
  if (scheduled.status !== "PENDING") {
    return NextResponse.json({ 
      error: `Cannot update ${scheduled.status.toLowerCase()} message` 
    }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { content, scheduledFor, mediaUrls } = parsed.data;

    const updated = await prisma.scheduledMessage.update({
      where: { id },
      data: {
        ...(content && { content }),
        ...(scheduledFor && { scheduledFor: new Date(scheduledFor) }),
        ...(mediaUrls && { mediaUrls }),
      },
    });

    log.info("Scheduled message updated", { scheduledId: id, userId: user.id });

    return NextResponse.json({ scheduled: updated });
  } catch (error: any) {
    log.error("Failed to update scheduled message", { error: error.message });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/**
 * DELETE - Cancel scheduled message
 */
export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: `/api/scheduled-messages/${id}`, requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scheduled = await prisma.scheduledMessage.findUnique({
    where: { id },
  });

  if (!scheduled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (scheduled.userId !== user.id && !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Can only cancel pending messages
  if (scheduled.status !== "PENDING") {
    return NextResponse.json({ 
      error: `Cannot cancel ${scheduled.status.toLowerCase()} message` 
    }, { status: 400 });
  }

  await prisma.scheduledMessage.update({
    where: { id },
    data: {
      status: "CANCELLED",
      error: "Cancelled by user",
    },
  });

  log.info("Scheduled message cancelled", { scheduledId: id, userId: user.id });
  return NextResponse.json({ success: true });
}