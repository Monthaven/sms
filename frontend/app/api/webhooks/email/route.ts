/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger, generateRequestId } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/webhooks/email", requestId });

  try {
    const payload = await request.json();

    await prisma.webhookLog.create({
      data: {
        provider: "EMAIL_INBOUND",
        direction: "INBOUND",
        status: "RECEIVED",
        statusCode: 200,
        payload,
      },
    });

    log.info("Email webhook received", { provider: "EMAIL_INBOUND" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("Email webhook error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
