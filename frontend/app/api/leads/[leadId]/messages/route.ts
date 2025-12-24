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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const currentUser = await getCurrentUser();
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
    console.error("SMS send failed:", smsResult.error);
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

  return NextResponse.json({
    id: message.id,
    direction: message.direction,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    status: message.status,
    provider: provider,
  });
}
