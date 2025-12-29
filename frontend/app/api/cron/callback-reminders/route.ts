/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publishEvent, events } from "@/lib/events";

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
        contact: {
          select: { firstName: true, lastName: true, phoneE164: true },
        },
        assignedTo: {
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
          userId: lead.assignedToId,
          type: "CALLBACK_DUE",
          priority: "HIGH",
          title: "Callback Due Soon",
          body: `Callback for ${lead.contact?.firstName || "Contact"} ${lead.contact?.lastName || ""} in ${Math.round((lead.callbackAt!.getTime() - now.getTime()) / 60000)} minutes`,
          actionUrl: `/sms/dial/${lead.id}`,
          actionLabel: "Call Now",
          relatedType: "Lead",
          relatedId: lead.id,
        },
      });

      // Send real-time event
      publishEvent(lead.assignedToId, events.callbackDue({
        leadId: lead.id,
        contactName: `${lead.contact?.firstName || ""} ${lead.contact?.lastName || ""}`.trim(),
        phone: lead.contact?.phoneE164 || "",
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
    console.error("Callback reminders error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
