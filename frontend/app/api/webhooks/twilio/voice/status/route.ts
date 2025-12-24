/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Twilio Voice Status Webhook
 * Updates call records via unified lib/calls.ts
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { updateCallStatus, type CallStatus } from "@/lib/calls";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Map Twilio status to our CallStatus
function mapTwilioStatus(twilioStatus: string): CallStatus | null {
  const statusMap: Record<string, CallStatus> = {
    "initiated": "INITIATED",
    "ringing": "RINGING",
    "in-progress": "CONNECTED",
    "completed": "COMPLETED",
    "busy": "BUSY",
    "no-answer": "NO_ANSWER",
    "failed": "FAILED",
    "canceled": "FAILED",
  };
  return statusMap[twilioStatus.toLowerCase()] || null;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const payload = Object.fromEntries(
      Array.from(form.entries()).map(([k, v]) => [k, typeof v === "string" ? v : `${v}`])
    );

    // Log the webhook
    await prisma.webhookLog.create({
      data: {
        provider: "TWILIO",
        direction: "INBOUND",
        status: payload.CallStatus ?? "UNKNOWN",
        statusCode: 200,
        payload,
      },
    });

    // Update call record if we have a CallSid
    const callSid = payload.CallSid;
    const twilioStatus = payload.CallStatus;
    const duration = payload.CallDuration ? parseInt(payload.CallDuration, 10) : undefined;

    if (callSid && twilioStatus) {
      const status = mapTwilioStatus(twilioStatus);
      if (status) {
        await updateCallStatus(callSid, status, duration);
      }
    }

    return new NextResponse(
      ['<?xml version="1.0" encoding="UTF-8"?>', "<Response></Response>"].join(""),
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (err) {
    console.error("Twilio voice status webhook error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
