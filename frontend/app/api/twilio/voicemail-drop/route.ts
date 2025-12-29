/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTwilioClient } from "@/lib/twilio-client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/twilio/voicemail-drop
 * 
 * Drops a pre-recorded voicemail on the current call.
 * The agent's line is disconnected while the voicemail plays to the lead.
 * 
 * Body: { callSid: string, voicemailUrl?: string }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { callSid, voicemailUrl } = body;

    if (!callSid) {
      return NextResponse.json(
        { error: "Missing callSid" },
        { status: 400 }
      );
    }

    const client = getTwilioClient();
    
    // Default voicemail message URL (can be customized per user/campaign)
    const vmUrl = voicemailUrl || process.env.DEFAULT_VOICEMAIL_URL || 
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://sms.monthavencapital.com'}/api/twilio/voicemail-drop/twiml`;

    // Update the call to play the voicemail
    // This replaces the current TwiML with our voicemail TwiML
    await client.calls(callSid).update({
      twiml: `
        <Response>
          <Play>${vmUrl}</Play>
          <Pause length="1"/>
          <Hangup/>
        </Response>
      `.trim(),
    });

    logger.info("Voicemail dropped", { callSid, userId: user.id, vmUrl });

    return NextResponse.json({ 
      success: true, 
      message: "Voicemail dropped successfully" 
    });

  } catch (error: any) {
    logger.error("Voicemail drop failed", { error: error.message });
    
    // Handle specific Twilio errors
    if (error.code === 20404) {
      return NextResponse.json(
        { error: "Call not found or already ended" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to drop voicemail" },
      { status: 500 }
    );
  }
}
