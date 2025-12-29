/**
 * PROPRIETARY — Always Improving LLC
 * Push Notification Subscription API
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";
import { isPushConfigured, getVapidPublicKey, sendPushToUser } from "@/lib/push-notifications";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET - Get VAPID public key
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = getVapidPublicKey();
  
  if (!publicKey) {
    return NextResponse.json({ 
      error: "Push notifications not configured" 
    }, { status: 501 });
  }

  return NextResponse.json({ publicKey });
}

/**
 * POST - Subscribe to push notifications
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/push/subscribe", requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscription = await req.json();

    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ 
        error: "Invalid subscription object" 
      }, { status: 400 });
    }

    // Store subscription in user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pushSubscription: subscription,
      },
    });

    log.info("Push subscription saved", { userId: user.id });

    // Send test notification
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: "Notifications Enabled",
          body: "You will now receive push notifications",
          icon: "/icon-192.png",
        })
      );
    } catch (pushError: any) {
      log.warn("Test notification failed", { error: pushError.message });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    log.error("Failed to save subscription", { error: error.message });
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}

/**
 * DELETE - Unsubscribe from push notifications
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pushSubscription: Prisma.JsonNull,
    },
  });

  return NextResponse.json({ success: true });
}

