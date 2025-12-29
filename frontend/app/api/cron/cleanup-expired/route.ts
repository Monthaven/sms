/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Delete expired notifications (older than 24 hours and read)
    const deletedNotifications = await db.notification.deleteMany({
      where: {
        OR: [
          // Delete read notifications older than 24 hours
          {
            read: true,
            createdAt: { lt: oneDayAgo },
          },
          // Delete expired notifications
          {
            expiresAt: { lt: now },
          },
        ],
      },
    });

    // Clean up old event logs (older than 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    // EventLog model might not exist yet, so we'll skip this for now
    // const deletedEvents = await db.eventLog.deleteMany({
    //   where: {
    //     createdAt: { lt: sevenDaysAgo },
    //   },
    // });

    return NextResponse.json({
      success: true,
      deletedNotifications: deletedNotifications.count,
      // deletedEvents: deletedEvents.count,
    });
  } catch (error) {
    console.error("Cleanup expired error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
