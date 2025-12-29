/**
 * PROPRIETARY — Always Improving LLC
 * Manager Call Monitoring - Listen, Whisper, Barge functionality
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getTwilioClient } from "@/lib/twilio-client";
import { logger, generateRequestId } from "@/lib/logger";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sms.monthavencapital.com";

interface MonitorRequest {
  callSid: string;
  mode: "listen" | "whisper" | "barge";
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/twilio/voice/monitor", requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only managers and admins can monitor
  if (!["MANAGER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body: MonitorRequest = await req.json();
    const { callSid, mode } = body;

    if (!callSid || !mode) {
      return NextResponse.json(
        { error: "Missing required fields: callSid, mode" },
        { status: 400 }
      );
    }

    // Get current call
    const call = await prisma.call.findUnique({
      where: { twilioCallSid: callSid },
      include: { user: true },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (call.status !== "connected" && call.status !== "in-progress") {
      return NextResponse.json({ error: "Call is not active" }, { status: 400 });
    }

    const client = getTwilioClient();
    const conferenceName = `monitor_${callSid}`;

    log.info("Manager monitoring call", { 
      managerId: user.id, 
      callSid, 
      mode,
      agentId: call.userId,
    });

    // First, move the active call to a conference
    const moveToConference = new VoiceResponse();
    const dial = moveToConference.dial();
    dial.conference({
      startConferenceOnEnter: true,
      endConferenceOnExit: true,
      beep: "false" as any,
    }, conferenceName);

    await client.calls(callSid).update({
      twiml: moveToConference.toString(),
    });

    // Update call with monitoring info
    await prisma.call.update({
      where: { id: call.id },
      data: { monitoredBy: user.id },
    });

    // Generate TwiML for manager to join with appropriate settings
    const managerTwiml = new VoiceResponse();
    const managerDial = managerTwiml.dial();

    switch (mode) {
      case "listen":
        // Manager hears both sides, neither hears manager
        managerDial.conference({
          startConferenceOnEnter: false,
          endConferenceOnExit: false,
          muted: true,
          beep: "false" as any,
        }, conferenceName);
        break;

      case "whisper":
        // Manager can only talk to agent (coach mode)
        managerDial.conference({
          startConferenceOnEnter: false,
          endConferenceOnExit: false,
          muted: false,
          beep: "false" as any,
          coach: call.userId, // Only agent hears manager
        }, conferenceName);
        break;

      case "barge":
        // Manager joins as full participant
        managerDial.conference({
          startConferenceOnEnter: false,
          endConferenceOnExit: false,
          muted: false,
          beep: "true" as any, // Beep to indicate someone joined
        }, conferenceName);
        break;
    }

    // Send notification to agent that they're being monitored (for whisper/barge)
    if (mode !== "listen") {
      await prisma.notification.create({
        data: {
          userId: call.userId,
          type: "MANAGER_ALERT",
          priority: "LOW",
          title: mode === "whisper" ? "Manager Coaching" : "Manager Joined Call",
          body: `${user.name} has ${mode === "whisper" ? "started coaching" : "joined"} your call`,
          relatedType: "Call",
          relatedId: call.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      mode,
      conferenceName,
      twiml: managerTwiml.toString(),
      message: `Monitor mode: ${mode} activated`,
    });
  } catch (error: any) {
    log.error("Monitor handler error", { error: error.message });
    return NextResponse.json({ error: "Monitor failed" }, { status: 500 });
  }
}

/**
 * DELETE - Stop monitoring a call
 */
export async function DELETE(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/twilio/voice/monitor/stop", requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const callSid = searchParams.get("callSid");

    if (!callSid) {
      return NextResponse.json({ error: "Missing callSid" }, { status: 400 });
    }

    const call = await prisma.call.findUnique({
      where: { twilioCallSid: callSid },
    });

    if (call && call.monitoredBy === user.id) {
      await prisma.call.update({
        where: { id: call.id },
        data: { monitoredBy: null },
      });
    }

    log.info("Manager stopped monitoring", { managerId: user.id, callSid });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log.error("Stop monitor error", { error: error.message });
    return NextResponse.json({ error: "Failed to stop monitoring" }, { status: 500 });
  }
}
