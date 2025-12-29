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
    console.error("Recording callback error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
