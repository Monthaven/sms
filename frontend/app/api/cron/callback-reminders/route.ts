/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publishEvent, events } from "@/lib/events";
import { logger, generateRequestId } from "@/lib/logger";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes ahead

    // Find leads with upcoming callbacks
    const upcomingCallbacks = await db.lead.findMany({
      where: {
        callbackAt: {
          gte: now,
          lte: reminderWindow,
        },
        assignedToId: { not: null },
        status: { in: ["QUEUED_FOR_CALL", "CONVERSATION_ACTIVE"] },
      },
      include: {
        Contact: {
          select: { firstName: true, lastName: true, phoneE164: true },
        },
        User: {
          select: { id: true, name: true },
        },
      },
    });

    let notificationsSent = 0;

    for (const lead of upcomingCallbacks) {
      if (!lead.assignedToId) continue;

      // Create notification
      await db.notification.create({
        data: {
          id: randomUUID(),
          userId: lead.assignedToId,
          type: "CALLBACK_DUE",
          priority: "HIGH",
          title: "Callback Due Soon",
          body: `Callback for ${lead.Contact?.firstName || "Contact"} ${lead.Contact?.lastName || ""} in ${Math.round((lead.callbackAt!.getTime() - now.getTime()) / 60000)} minutes`,
          actionUrl: `/sms/dial/${lead.id}`,
          actionLabel: "Call Now",
          relatedType: "Lead",
          relatedId: lead.id,
        },
      });

      // Send real-time event
      publishEvent(lead.assignedToId, events.callbackDue({
        leadId: lead.id,
        contactName: `${lead.Contact?.firstName || ""} ${lead.Contact?.lastName || ""}`.trim(),
        phone: lead.Contact?.phoneE164 || "",
        scheduledAt: lead.callbackAt!.toISOString(),
      }));

      notificationsSent++;
    }

    return NextResponse.json({
      success: true,
      callbacksFound: upcomingCallbacks.length,
      notificationsSent,
    });
  } catch (error) {
    const requestId = generateRequestId();
    logger.error("Callback reminders error", { requestId }, error as Error);
    return NextResponse.json({ error: "Internal error", requestId }, { status: 500 });
  }
}
