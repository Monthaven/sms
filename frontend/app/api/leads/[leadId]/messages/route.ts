/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendSMS, type SMSProvider } from "@/lib/sms";
import { randomUUID } from "crypto";
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { logger, generateRequestId } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/leads/[leadId]/messages", requestId });
  
  // Rate limiting by user or IP
  const currentUser = await getCurrentUser();
  const identifier = currentUser?.id || req.headers.get("x-forwarded-for") || "anonymous";
  const rateLimit = checkRateLimit(identifier, RATE_LIMITS.SMS_SEND);
  
  if (!rateLimit.success) {
    log.warn("Rate limit exceeded", { identifier });
    return NextResponse.json(
      { error: { message: "Too many requests" } },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }
  
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const { leadId } = await params;
  const body = await req.json();
  const { body: messageBody, provider = "twilio" } = body;

  if (!messageBody?.trim()) {
    return NextResponse.json({ error: { message: "Message body required" } }, { status: 400 });
  }

  // Get lead with contact
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      contact: { select: { id: true, phoneE164: true } },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: { message: "Lead not found" } }, { status: 404 });
  }

  if (!lead.contact?.phoneE164) {
    return NextResponse.json({ error: { message: "No phone number for this lead" } }, { status: 400 });
  }

  // Send via unified SMS utility (supports Twilio and EzTexting)
  const smsResult = await sendSMS({
    leadId,
    to: lead.contact.phoneE164,
    message: messageBody,
    provider: provider as SMSProvider,
  });

  if (!smsResult.success) {
    log.error("SMS send failed", { leadId, error: smsResult.error });
    return NextResponse.json(
      { error: { message: smsResult.error || "Failed to send message" } },
      { status: 500 }
    );
  }

  // Record in database - Message model connects via contactId
  const message = await prisma.message.create({
    data: {
      id: randomUUID(),
      phone: lead.contact.phoneE164,
      direction: "OUTBOUND",
      body: messageBody,
      status: "SENT",
      provider: provider,
      external_id: smsResult.externalId,
      contactId: lead.contact.id,
      updatedAt: new Date(),
    },
  });

  log.info("SMS sent successfully", { leadId, messageId: message.id, provider });

  return NextResponse.json({
    id: message.id,
    direction: message.direction,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    status: message.status,
    provider: provider,
  });
}
