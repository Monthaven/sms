/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Whisper Webhook
 * Plays a message to the agent before connecting them to the caller
 * This lets them know who's calling before the call connects
 */

import { NextResponse } from "next/server";
import twilio from "twilio";
import { logger } from "@/lib/logger";

const VoiceResponse = twilio.twiml.VoiceResponse;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const caller = url.searchParams.get("caller") || "Unknown";

  const log = logger.child({ handler: "whisper" });
  log.info("Whisper requested", { caller });

  const response = new VoiceResponse();
  
  // Gather a key press to accept the call
  const gather = response.gather({
    numDigits: 1,
    action: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/voice/whisper-accept`,
    timeout: 5,
  });

  gather.say(
    { voice: "Polly.Matthew" },
    `Incoming call from ${caller}. Press any key to accept.`
  );

  // If no key pressed, reject
  response.say(
    { voice: "Polly.Matthew" },
    "No response. Routing to voicemail."
  );
  response.hangup();

  return new NextResponse(response.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(request: Request) {
  // Also handle GET for testing
  return POST(request);
}
