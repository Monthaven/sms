/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/twilio/voicemail-drop/twiml
 * 
 * Returns the default voicemail TwiML that plays a professional message.
 * This endpoint is publicly accessible (no auth) as Twilio needs to fetch it.
 */
export async function GET() {
  // Professional voicemail message
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew" language="en-US">
    Hi, this is Month Haven Capital calling about a property we believe you may own.
    We're interested in making you a fair cash offer.
    If you'd like to discuss, please call us back at your earliest convenience,
    or reply to our text message.
    Thank you and have a great day!
  </Say>
  <Pause length="1"/>
</Response>`;

  return new NextResponse(twiml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}

/**
 * POST handler for Twilio webhook compatibility
 */
export async function POST() {
  return GET();
}
