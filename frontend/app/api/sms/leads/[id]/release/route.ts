/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { publishEvent, events } from "@/lib/events";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Find the lead
    const lead = await db.lead.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check if this user owns the lead
    if (lead.assignedToId !== currentUser.id) {
      return NextResponse.json({ error: "Not your lead to release" }, { status: 403 });
    }

    // Release the lead
    await db.lead.update({
      where: { id },
      data: {
        assignedToId: null,
        assignedAt: null,
        lockExpiresAt: null,
        status: "QUEUED_FOR_CALL",
      },
    });

    // Log the release
    await db.leadAudit.create({
      data: {
        leadId: id,
        userId: currentUser.id,
        action: "RELEASED",
        details: "Lead released back to queue",
        updatedAt: new Date(),
      },
    });

    // Broadcast queue update
    publishEvent(currentUser.id, events.queueUpdate({
      available: 0, // Would need to query actual count
      pending: 0,
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Release lead error:", error);
    return NextResponse.json({ error: "Failed to release lead" }, { status: 500 });
  }
}
