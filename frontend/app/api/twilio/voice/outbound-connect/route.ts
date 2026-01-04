/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { validateTwilioWebhook, formDataToParams } from "@/lib/twilio-webhook";

const VoiceResponse = twilio.twiml.VoiceResponse;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://sms.monthavencapital.com").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const params = formDataToParams(form);
    const data = params;

    const signatureValidation = validateTwilioWebhook(req, params);
    if (!signatureValidation.valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const response = new VoiceResponse();

    // Get the phone number to dial from the request params
    const toRaw = data.To || data.PhoneNumber;
    const to = toRaw ? (toRaw.startsWith("+") ? toRaw : `+${toRaw.replace(/[^\d]/g, "")}`) : "";
    const callerId =
      process.env.TWILIO_MAIN_FROM ||
      process.env.TWILIO_PHONE_NUMBER ||
      process.env.TWILIO_FROM_NUMBER ||
      "";

    if (!to) {
      response.say("Sorry, no phone number was specified.");
      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Dial the number
    const dial = response.dial({
      callerId,
      record: "record-from-answer-dual",
      recordingStatusCallback: `${APP_URL}/api/twilio/voice/recording`,
      recordingStatusCallbackEvent: ["completed"],
      answerOnBridge: true,
      timeout: 30,
    });

    dial.number(
      {
        statusCallback: `${APP_URL}/api/twilio/voice/dial-status`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      },
      to
    );

    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Outbound connect error:", error);
    const response = new VoiceResponse();
    response.say("Sorry, an error occurred connecting your call.");
    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
