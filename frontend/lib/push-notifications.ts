/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import webpush from "web-push";

// Configure web-push if VAPID keys are available
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || "support@monthavengroup.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  icon?: string;
  badge?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
}

interface PushResult {
  sent: boolean;
  reason?: string;
}

/**
 * Send push notification to a user
 */
export async function sendPushToUser(
  userId: string, 
  payload: PushPayload
): Promise<PushResult> {
  const log = logger.child({ fn: "sendPushToUser" });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushSubscription: true },
  });

  if (!user?.pushSubscription) {
    return { sent: false, reason: "No subscription" };
  }

  try {
    await webpush.sendNotification(
      user.pushSubscription as unknown as webpush.PushSubscription,
      JSON.stringify({
        ...payload,
        icon: payload.icon || "/icon-192.png",
        badge: payload.badge || "/badge-72.png",
      })
    );

    return { sent: true };
  } catch (error: any) {
    log.error("Push send failed", { userId, error: error.message });

    // If subscription is invalid, remove it
    if (error.statusCode === 410 || error.statusCode === 404) {
      await prisma.user.update({
        where: { id: userId },
        data: { pushSubscription: Prisma.JsonNull },
      });
    }

    return { sent: false, reason: error.message };
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ successful: number; failed: number; results: Array<{ userId: string } & PushResult> }> {
  const results: Array<{ userId: string } & PushResult> = [];
  let successful = 0;
  let failed = 0;

  for (const userId of userIds) {
    const result = await sendPushToUser(userId, payload);
    results.push({ userId, ...result });
    if (result.sent) {
      successful++;
    } else {
      failed++;
    }
  }

  return { successful, failed, results };
}

/**
 * Send push notification to all users with a specific role
 */
export async function sendPushToRole(
  role: "ADMIN" | "AGENT" | "CALLER" | "MANAGER" | "INVESTOR",
  payload: PushPayload
): Promise<{ successful: number; failed: number }> {
  const users = await prisma.user.findMany({
    where: {
      role,
      pushSubscription: { not: Prisma.JsonNull },
    },
    select: { id: true },
  });

  const userIds = users.map(u => u.id);
  const { successful, failed } = await sendPushToUsers(userIds, payload);
  
  return { successful, failed };
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/**
 * Get the VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}
