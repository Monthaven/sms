/**
 * PROPRIETARY — Always Improving LLC
 * Voicemail Handler - Receives and stores voicemail recordings
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateTwilioWebhook, formDataToParams } from "@/lib/twilio-webhook";
import { logger, generateRequestId } from "@/lib/logger";
import { notifications } from "@/lib/notifications";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/twilio/voice/voicemail", requestId });

  try {
    const form = await req.formData();
    const params = formDataToParams(form);

    // Validate Twilio signature
    const signatureValidation = validateTwilioWebhook(req, params);
    if (!signatureValidation.valid) {
      log.warn("Invalid Twilio signature for voicemail");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const callSid = params["CallSid"] || "";
    const recordingUrl = params["RecordingUrl"] || "";
    const recordingSid = params["RecordingSid"] || "";
    const recordingDuration = parseInt(params["RecordingDuration"] || "0", 10);
    const from = params["From"] || "";

    log.info("Voicemail received", { callSid, recordingSid, recordingDuration });

    // Update the call record with voicemail info
    const call = await prisma.call.update({
      where: { twilioCallSid: callSid },
      data: {
        status: "voicemail",
        voicemailUrl: recordingUrl ? `${recordingUrl}.mp3` : undefined,
        recordingSid,
        recordingDuration,
        endedAt: new Date(),
      },
      include: {
        contact: true,
        user: true,
      },
    });

    // Create high-priority notification for all online agents
    const onlineAgents = await prisma.user.findMany({
      where: {
        role: { in: ["CALLER", "AGENT", "MANAGER"] },
        isOnline: true,
      },
      select: { id: true },
    });

    const callerName = call.contact
      ? `${call.contact.firstName || ""} ${call.contact.lastName || ""}`.trim() || from
      : from;

    // Create notifications for all online agents
    for (const agent of onlineAgents) {
      await prisma.notification.create({
        data: {
          userId: agent.id,
          type: "VOICEMAIL",
          priority: "HIGH",
          title: `New Voicemail from ${callerName}`,
          body: `Duration: ${recordingDuration}s`,
          actionUrl: `/dashboard/calls/${call.id}`,
          actionLabel: "Listen",
          relatedType: "Call",
          relatedId: call.id,
        },
      });

      // Also send via notification service
      await notifications.incomingCall(
        agent.id,
        `Voicemail: ${callerName}`,
        callSid
      );
    }

    // Return TwiML to end the call gracefully
    const twiml = new VoiceResponse();
    twiml.say({
      voice: "Polly.Matthew",
      language: "en-US",
    }, "Thank you for your message. We will return your call as soon as possible. Goodbye.");
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    log.error("Voicemail handler error", { error: error.message });

    const twiml = new VoiceResponse();
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
