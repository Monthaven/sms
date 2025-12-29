/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Whisper Accept Webhook
 * Called when agent presses a key to accept the call
 */

import { NextResponse } from "next/server";
import twilio from "twilio";
import { logger } from "@/lib/logger";

const VoiceResponse = twilio.twiml.VoiceResponse;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const log = logger.child({ handler: "whisper-accept" });
  log.info("Call accepted by agent");

  const response = new VoiceResponse();
  
  // Say a brief connecting message
  response.say(
    { voice: "Polly.Matthew" },
    "Connecting now."
  );

  // Return empty TwiML to continue the call (connect to caller)
  // The dial will automatically complete after this

  return new NextResponse(response.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
