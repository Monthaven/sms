/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateTwilioWebhook, formDataToParams } from "@/lib/twilio-webhook";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const log = logger.child({ endpoint: "/api/twilio/voice/recording" });
  try {
    const form = await req.formData();
    const params = formDataToParams(form);
    const data = params;

    const signatureValidation = validateTwilioWebhook(req, params);
    if (!signatureValidation.valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    
    const {
      CallSid,
      RecordingUrl,
      RecordingSid,
      RecordingDuration,
      RecordingStatus,
    } = data;

    if (RecordingStatus !== "completed") {
      return NextResponse.json({ success: true });
    }

    // Find the call and update with recording info
    const call = await db.call.findUnique({
      where: { twilioCallSid: CallSid },
    });

    if (call) {
      await db.call.update({
        where: { id: call.id },
        data: {
          recordingUrl: RecordingUrl,
          recordingSid: RecordingSid,
          recordingDuration: RecordingDuration ? parseInt(RecordingDuration, 10) : null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Recording callback error", { error: (error as any)?.message || String(error) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
