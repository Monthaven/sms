/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest } from "next/server";
import { subscribe, type AgentEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  // For now, use a cookie-based userId if not provided
  const effectiveUserId = userId || request.cookies.get("mae_user")?.value || "anonymous";

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`)
      );

      // Subscribe to events for this user
      unsubscribe = subscribe(effectiveUserId, (event: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Controller closed, ignore
        }
      });

      // Send heartbeat every 30 seconds
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Controller closed, cleanup will happen in cancel
        }
      }, 30000);
    },

    cancel() {
      // Cleanup on client disconnect
      if (unsubscribe) {
        unsubscribe();
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
