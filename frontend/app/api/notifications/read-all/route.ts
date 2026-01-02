/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";

export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Mark all unread notifications as read
    await db.notification.updateMany({
      where: {
        userId: currentUser.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const requestId = generateRequestId();
    logger.error("Failed to mark all notifications as read", { requestId }, error as Error);
    return NextResponse.json({ error: "Failed to update", requestId }, { status: 500 });
  }
}
