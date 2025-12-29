/**
 * PROPRIETARY — Always Improving LLC
 * Call Hold Handler - Put calls on hold with music
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getTwilioClient } from "@/lib/twilio-client";
import { logger, generateRequestId } from "@/lib/logger";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOLD_MUSIC_URL = process.env.HOLD_MUSIC_URL || "http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical";

interface HoldRequest {
  callSid: string;
  hold: boolean;
}

export async function PUT(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/twilio/voice/hold", requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: HoldRequest = await req.json();
    const { callSid, hold } = body;

    if (!callSid || typeof hold !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: callSid, hold" },
        { status: 400 }
      );
    }

    // Get current call
    const call = await prisma.call.findUnique({
      where: { twilioCallSid: callSid },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Verify user owns this call
    if (call.userId !== user.id && !["MANAGER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Not your call" }, { status: 403 });
    }

    const client = getTwilioClient();

    if (hold) {
      // Put call on hold with music
      log.info("Putting call on hold", { callSid, userId: user.id });

      const twiml = new VoiceResponse();
      twiml.say({
        voice: "Polly.Matthew",
      }, "Please hold.");
      twiml.play({ loop: 0 }, HOLD_MUSIC_URL);

      await client.calls(callSid).update({
        twiml: twiml.toString(),
      });

      // Track hold start time
      await prisma.call.update({
        where: { id: call.id },
        data: {
          holdStartedAt: new Date(),
          status: "on_hold",
        },
      });

      return NextResponse.json({ 
        success: true, 
        hold: true,
        message: "Call placed on hold",
      });

    } else {
      // Take call off hold
      log.info("Taking call off hold", { callSid, userId: user.id });

      // Calculate hold duration
      let holdDuration = 0;
      if (call.holdStartedAt) {
        holdDuration = Math.floor(
          (new Date().getTime() - new Date(call.holdStartedAt).getTime()) / 1000
        );
      }

      // Resume the call by connecting back to agent
      const twiml = new VoiceResponse();
      const dial = twiml.dial();
      dial.client(user.id);

      await client.calls(callSid).update({
        twiml: twiml.toString(),
      });

      // Update call record
      await prisma.call.update({
        where: { id: call.id },
        data: {
          holdStartedAt: null,
          holdDuration: (call.holdDuration || 0) + holdDuration,
          status: "in-progress",
        },
      });

      return NextResponse.json({ 
        success: true, 
        hold: false,
        holdDuration,
        message: "Call resumed",
      });
    }
  } catch (error: any) {
    log.error("Hold handler error", { error: error.message });
    return NextResponse.json({ error: "Hold operation failed" }, { status: 500 });
  }
}

/**
 * GET - Check hold status
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const callSid = searchParams.get("callSid");

  if (!callSid) {
    return NextResponse.json({ error: "Missing callSid" }, { status: 400 });
  }

  const call = await prisma.call.findUnique({
    where: { twilioCallSid: callSid },
    select: {
      id: true,
      status: true,
      holdStartedAt: true,
      holdDuration: true,
    },
  });

  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  const isOnHold = call.status === "on_hold";
  let currentHoldDuration = call.holdDuration || 0;
  
  if (isOnHold && call.holdStartedAt) {
    currentHoldDuration += Math.floor(
      (new Date().getTime() - new Date(call.holdStartedAt).getTime()) / 1000
    );
  }

  return NextResponse.json({
    isOnHold,
    holdDuration: currentHoldDuration,
  });
}
