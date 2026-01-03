/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { sendSMS } from "@/lib/sms";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { smsSendRequestSchema, validateRequest } from "@/lib/validation-schemas";
import { logger } from "@/lib/logger";
import { incrementCounter } from "@/lib/metrics";

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const log = logger.child({ endpoint: "/api/sms/send", clientIP });

  // Auth check
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  // Rate limiting
  const rateLimit = await checkRateLimit(`sms_send:${clientIP}`, RATE_LIMITS.SMS_SEND);
  if (!rateLimit.success) {
    log.warn("Rate limit exceeded", { remaining: rateLimit.remaining });
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateRequest(smsSendRequestSchema, body);
    if (!validation.success) {
      log.warn("Validation failed", { error: validation.error });
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const { leadId, to, message, provider } = validation.data;

    const result = await sendSMS({
      leadId,
      to,
      message,
      provider,
    });

    if (!result.success) {
      log.error("SMS send failed", { error: result.error });
      incrementCounter("sms.send.fail", { provider, reason: result.error });
      return NextResponse.json(
        { error: result.error },
        { status: 500, headers: rateLimitHeaders(rateLimit) }
      );
    }

    log.info("SMS sent successfully", { provider: result.provider, externalId: result.externalId });
    incrementCounter("sms.send.success", { provider: result.provider });

    return NextResponse.json(
      {
        success: true,
        provider: result.provider,
        externalId: result.externalId,
      },
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error: any) {
    log.error("SMS send error", {}, error);
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}
