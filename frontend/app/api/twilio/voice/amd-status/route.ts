/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseFormData } from "@/lib/twilio-parser";
import { validateTwilioWebhook, formDataToParams } from "@/lib/twilio-webhook";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const log = logger.child({ endpoint: "/api/twilio/voice/amd-status" });
  try {
    const form = await req.formData();
    const params = formDataToParams(form);

    const signatureValidation = validateTwilioWebhook(req, params);
    if (!signatureValidation.valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = await parseFormData(req);
    
    const {
      CallSid,
      AnsweredBy,
      MachineDetectionDuration,
    } = data;

    // Find the call and update with AMD result
    const call = await db.call.findUnique({
      where: { twilioCallSid: CallSid },
    });

    if (call) {
      await db.call.update({
        where: { id: call.id },
        data: {
          status: AnsweredBy === "machine_start" || AnsweredBy === "machine_end_beep" || AnsweredBy === "machine_end_silence" 
            ? "voicemail" 
            : "in-progress",
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      answeredBy: AnsweredBy,
      duration: MachineDetectionDuration,
    });
  } catch (error) {
    log.error("AMD status error", { error: (error as any)?.message || String(error) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
