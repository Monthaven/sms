/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Dial Status Webhook
 * Called when dial attempt completes (answered, busy, no-answer, failed)
 * If no one answered, redirect to voicemail
 */

import { NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { formDataToParams } from "@/lib/twilio-webhook";

const VoiceResponse = twilio.twiml.VoiceResponse;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sms.monthavencapital.com";
const AGENT_NAME = process.env.AGENT_NAME || "Monthaven Capital";

export async function POST(request: Request) {
  const log = logger.child({ handler: "dial-status" });
  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId");
  const callSid = url.searchParams.get("callSid");

  try {
    const form = await request.formData();
    const params = formDataToParams(form);

    const dialCallStatus = params["DialCallStatus"] ?? "";
    const dialCallDuration = parseInt(params["DialCallDuration"] ?? "0", 10);

    log.info("Dial status received", { dialCallStatus, dialCallDuration, leadId, callSid });

    // Update call record
    if (callSid) {
      await prisma.call.updateMany({
        where: { twilioCallSid: callSid },
        data: {
          status: dialCallStatus === "completed" ? "completed" : dialCallStatus,
          duration: dialCallDuration,
          endedAt: dialCallStatus === "completed" ? new Date() : undefined,
          answeredAt: dialCallStatus === "completed" && dialCallDuration > 0 ? new Date(Date.now() - dialCallDuration * 1000) : undefined,
        },
      });
    }

    const response = new VoiceResponse();

    // If the call was answered and completed normally, just hang up
    if (dialCallStatus === "completed" && dialCallDuration > 0) {
      response.hangup();
      return new NextResponse(response.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Otherwise (busy, no-answer, failed), go to voicemail
    response.say(
      { voice: "Polly.Joanna" },
      `We're sorry, but our agent is not available right now. Please leave a message after the tone, and we'll call you back as soon as possible.`
    );

    response.record({
      maxLength: 120,
      transcribe: true,
      transcribeCallback: `${APP_URL}/api/webhooks/twilio/voice/transcription`,
      recordingStatusCallback: `${APP_URL}/api/webhooks/twilio/voice/recording?leadId=${leadId || ""}`,
      playBeep: true,
    });

    response.say({ voice: "Polly.Joanna" }, "Thank you for your message. Goodbye.");
    response.hangup();

    // Update call status to voicemail
    if (callSid) {
      await prisma.call.updateMany({
        where: { twilioCallSid: callSid },
        data: { 
          status: "voicemail",
          disposition: dialCallStatus,
        },
      });
    }

    return new NextResponse(response.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    log.error("Dial status webhook error", {}, err as Error);
    
    const response = new VoiceResponse();
    response.say({ voice: "Polly.Joanna" }, "An error occurred. Goodbye.");
    response.hangup();
    
    return new NextResponse(response.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
