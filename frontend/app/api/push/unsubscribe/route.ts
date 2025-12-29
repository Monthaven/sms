/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Clear push subscription for this user
    await db.user.update({
      where: { id: currentUser.id },
      data: {
        pushSubscription: Prisma.JsonNull,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to unsubscribe from push:", error);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
