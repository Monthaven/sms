/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/db";
import { validateTwilioWebhook, formDataToParams } from "@/lib/twilio-webhook";

const VoiceResponse = twilio.twiml.VoiceResponse;

async function buildResponse(params: URLSearchParams | Record<string, string>) {
  const to = (params instanceof URLSearchParams ? params.get("to") : params["To"] || params["to"]) || "";
  const callId = params instanceof URLSearchParams ? params.get("callId") : (params["CallId"] || params["callId"]);
  const callSid = params instanceof URLSearchParams ? undefined : params["CallSid"];

  if (callId && callSid) {
    await prisma.call.updateMany({
      where: { id: callId },
      data: { twilioCallSid: callSid, status: "RINGING" },
    });
  }

  const response = new VoiceResponse();

  if (!to) {
    response.say("Missing destination number.");
    response.hangup();
  } else {
    response.dial({
      callerId: process.env.TWILIO_MAIN_FROM || process.env.TWILIO_FROM_NUMBER,
      record: "record-from-answer",
      recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/status`,
      recordingStatusCallbackMethod: "POST",
    }).number({}, to);
  }

  return response.toString();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const twiml = await buildResponse(url.searchParams);
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const params = formDataToParams(form);
  
  // Validate Twilio signature
  const signatureValidation = validateTwilioWebhook(req, params);
  if (!signatureValidation.valid) {
    return NextResponse.json(
      { error: signatureValidation.error || "Invalid signature" },
      { status: 401 }
    );
  }
  
  const twiml = await buildResponse(params);
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}
