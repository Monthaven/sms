/**
 * PROPRIETARY — Always Improving LLC
 * SSE (Server-Sent Events) for Real-time Notifications
 */

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET - SSE stream for real-time updates
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  let isActive = true;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const initMsg = `data: ${JSON.stringify({ type: "connected", userId: user.id })}\n\n`;
      controller.enqueue(encoder.encode(initMsg));

      let lastCheck = new Date();

      // Poll for new notifications every 3 seconds
      intervalId = setInterval(async () => {
        if (!isActive) return;

        try {
          // Check for new notifications
          const newNotifications = await prisma.notification.findMany({
            where: {
              userId: user.id,
              createdAt: { gt: lastCheck },
              read: false,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          if (newNotifications.length > 0) {
            const msg = `data: ${JSON.stringify({ 
              type: "notifications", 
              notifications: newNotifications 
            })}\n\n`;
            controller.enqueue(encoder.encode(msg));
          }

          // Get live stats for dashboard updates (for managers)
          if (["ADMIN", "MANAGER"].includes(user.role)) {
            const activeCalls = await prisma.call.count({
              where: {
                status: { in: ["in-progress", "ringing", "on_hold"] },
              },
            });

            const onlineAgents = await prisma.user.count({
              where: {
                role: { in: ["CALLER", "AGENT"] },
                isOnline: true,
              },
            });

            const msg = `data: ${JSON.stringify({ 
              type: "stats", 
              activeCalls,
              onlineAgents,
            })}\n\n`;
            controller.enqueue(encoder.encode(msg));
          }

          lastCheck = new Date();

          // Send heartbeat
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));

        } catch (error) {
          logger.error("SSE poll error", { userId: user.id }, error as Error);
        }
      }, 3000);

      // Clean up on abort
      req.signal.addEventListener("abort", () => {
        isActive = false;
        if (intervalId) {
          clearInterval(intervalId);
        }
        controller.close();
      });
    },

    cancel() {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
