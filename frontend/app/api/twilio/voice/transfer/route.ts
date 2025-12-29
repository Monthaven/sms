/**
 * PROPRIETARY — Always Improving LLC
 * Call Transfer Handler - Warm and Cold transfers between agents
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getTwilioClient } from "@/lib/twilio-client";
import { logger, generateRequestId } from "@/lib/logger";
import { notifications } from "@/lib/notifications";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sms.monthavencapital.com";

interface TransferRequest {
  callSid: string;
  targetUserId: string;
  type: "warm" | "cold";
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/twilio/voice/transfer", requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: TransferRequest = await req.json();
    const { callSid, targetUserId, type } = body;

    if (!callSid || !targetUserId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: callSid, targetUserId, type" },
        { status: 400 }
      );
    }

    // Get the target agent
    const targetAgent = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, forwardNumber: true, isOnline: true, status: true },
    });

    if (!targetAgent) {
      return NextResponse.json({ error: "Target agent not found" }, { status: 404 });
    }

    if (!targetAgent.isOnline || targetAgent.status === "ON_BREAK") {
      return NextResponse.json({ error: "Target agent is not available" }, { status: 400 });
    }

    // Get current call
    const call = await prisma.call.findUnique({
      where: { twilioCallSid: callSid },
      include: { contact: true, lead: true },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const client = getTwilioClient();

    if (type === "cold") {
      // Cold transfer: Immediately route to new agent
      log.info("Initiating cold transfer", { callSid, targetUserId });

      const twiml = new VoiceResponse();
      twiml.say({
        voice: "Polly.Matthew",
      }, "Please hold while we transfer your call.");

      if (targetAgent.forwardNumber) {
        const dial = twiml.dial({
          callerId: call.toNumber || process.env.TWILIO_PHONE_NUMBER,
          action: `${APP_URL}/api/twilio/voice/dial-status`,
          timeout: 30,
        });
        dial.number(targetAgent.forwardNumber);
      } else {
        const dial = twiml.dial({
          callerId: call.toNumber || process.env.TWILIO_PHONE_NUMBER,
          action: `${APP_URL}/api/twilio/voice/dial-status`,
          timeout: 30,
        });
        dial.client(targetAgent.id);
      }

      // Update the call via Twilio API
      await client.calls(callSid).update({
        twiml: twiml.toString(),
      });

      // Update database
      await prisma.call.update({
        where: { id: call.id },
        data: {
          transferredFrom: user.id,
          transferredTo: targetUserId,
          userId: targetUserId,
        },
      });

      // Free up original agent
      await prisma.user.update({
        where: { id: user.id },
        data: { currentCallId: null, status: "ONLINE", lastActiveAt: new Date() },
      });

      // Assign to new agent
      await prisma.user.update({
        where: { id: targetUserId },
        data: { currentCallId: callSid, status: "ON_CALL", statusSince: new Date() },
      });

      // Notify target agent
      const callerName = call.contact
        ? `${call.contact.firstName || ""} ${call.contact.lastName || ""}`.trim()
        : call.fromNumber;

      await notifications.incomingCall(targetUserId, `Transfer from ${user.name}: ${callerName}`, callSid);

      return NextResponse.json({ success: true, type: "cold" });

    } else {
      // Warm transfer: Create conference with both agents first
      log.info("Initiating warm transfer", { callSid, targetUserId });

      const conferenceName = `transfer_${callSid}`;

      // Create notification for transfer request
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: "TRANSFER_REQUEST",
          priority: "HIGH",
          title: `Transfer Request from ${user.name}`,
          body: call.contact
            ? `Call with ${call.contact.firstName} ${call.contact.lastName}`.trim()
            : `Call from ${call.fromNumber}`,
          actionUrl: `/api/twilio/voice/transfer/accept?conference=${conferenceName}&callSid=${callSid}`,
          actionLabel: "Accept Transfer",
          relatedType: "Call",
          relatedId: call.id,
        },
      });

      // Move original call to conference
      const twiml = new VoiceResponse();
      twiml.say("Connecting to conference for transfer.");
      const dial = twiml.dial();
      dial.conference({
        startConferenceOnEnter: true,
        endConferenceOnExit: false,
        waitUrl: "http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical",
      }, conferenceName);

      await client.calls(callSid).update({
        twiml: twiml.toString(),
      });

      // Update call with transfer metadata
      await prisma.call.update({
        where: { id: call.id },
        data: {
          transferredFrom: user.id,
          transferredTo: targetUserId,
        },
      });

      return NextResponse.json({ 
        success: true, 
        type: "warm",
        conferenceName,
        message: "Transfer request sent to agent",
      });
    }
  } catch (error: any) {
    log.error("Transfer handler error", { error: error.message });
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }
}

/**
 * GET - Accept a warm transfer (called by target agent)
 */
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/twilio/voice/transfer/accept", requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const conferenceName = searchParams.get("conference");
    const callSid = searchParams.get("callSid");

    if (!conferenceName || !callSid) {
      return NextResponse.json({ error: "Missing conference or callSid" }, { status: 400 });
    }

    log.info("Agent accepting warm transfer", { userId: user.id, conferenceName });

    // Return TwiML to join the conference
    const twiml = new VoiceResponse();
    twiml.say("Joining transfer conference.");
    const dial = twiml.dial();
    dial.conference({
      startConferenceOnEnter: true,
      endConferenceOnExit: false,
    }, conferenceName);

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    log.error("Transfer accept error", { error: error.message });
    return NextResponse.json({ error: "Failed to accept transfer" }, { status: 500 });
  }
}
