/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import twilio from "twilio";
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
  const { body: messageBody } = body;

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

  // Send via Twilio
  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  let twilioMessage;
  try {
    twilioMessage = await twilioClient.messages.create({
      to: lead.contact.phoneE164,
      from: process.env.TWILIO_MAIN_FROM || "",
      body: messageBody,
    });
  } catch (err) {
    console.error("Twilio send failed:", err);
    return NextResponse.json(
      { error: { message: "Failed to send message" } },
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
      provider: "twilio",
      external_id: twilioMessage.sid,
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
  });
}
