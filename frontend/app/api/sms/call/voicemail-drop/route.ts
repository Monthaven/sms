/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import twilio from "twilio";
import { logger } from "@/lib/logger";

/**
 * POST /api/sms/call/voicemail-drop
 * Drops a pre-recorded voicemail on the current call and hangs up
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { callId } = body;

  if (!callId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "callId is required" } },
      { status: 400 }
    );
  }

  // Get the call record
  const call = await prisma.call.findUnique({
    where: { id: callId },
  });

  if (!call) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Call not found" } },
      { status: 404 }
    );
  }

  if (call.userId !== user.id) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Not your call" } },
      { status: 403 }
    );
  }

  if (!call.twilioCallSid) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "No active Twilio call" } },
      { status: 400 }
    );
  }

  try {
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Update the call to play voicemail and hang up
    const voicemailUrl = process.env.VOICEMAIL_RECORDING_URL || `${process.env.NEXT_PUBLIC_APP_URL}/audio/voicemail.mp3`;
    
    await twilioClient.calls(call.twilioCallSid).update({
      twiml: `<Response><Play>${voicemailUrl}</Play><Hangup/></Response>`,
    });

    // Update call record
    await prisma.call.update({
      where: { id: callId },
      data: {
        disposition: "LEFT_VOICEMAIL",
        notes: "Voicemail dropped",
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });

    // Update lead status
    if (call.leadId) {
      await prisma.lead.update({
        where: { id: call.leadId },
        data: {
          status: "QUEUED_FOR_CALL",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { message: "Voicemail dropped successfully" },
    });
  } catch (err) {
    logger.error("Voicemail drop failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to drop voicemail" } },
      { status: 500 }
    );
  }
}
