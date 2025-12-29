/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseFormData } from "@/lib/twilio-parser";

export async function POST(req: NextRequest) {
  try {
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
    console.error("AMD status error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
