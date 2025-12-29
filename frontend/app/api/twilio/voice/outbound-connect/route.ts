/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { parseFormData } from "@/lib/twilio-parser";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: NextRequest) {
  try {
    const data = await parseFormData(req);
    const response = new VoiceResponse();

    // Get the phone number to dial from the request params
    const to = data.To || data.PhoneNumber;
    const callerId = process.env.TWILIO_MAIN_FROM;

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
      recordingStatusCallback: "/api/twilio/voice/recording",
      recordingStatusCallbackEvent: ["completed"],
      answerOnBridge: true,
      timeout: 30,
    });

    dial.number(
      {
        statusCallback: "/api/twilio/voice/dial-status",
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
