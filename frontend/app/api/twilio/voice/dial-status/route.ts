/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseFormData } from "@/lib/twilio-parser";
import { publishEvent, events } from "@/lib/events";

export async function POST(req: NextRequest) {
  try {
    const data = await parseFormData(req);
    
    const {
      CallSid,
      DialCallSid,
      DialCallStatus,
      DialCallDuration,
    } = data;

    // Find the call record
    const call = await db.call.findUnique({
      where: { twilioCallSid: CallSid },
    });

    if (call) {
      // Update call with dial result
      await db.call.update({
        where: { id: call.id },
        data: {
          status: DialCallStatus || call.status,
          duration: DialCallDuration ? parseInt(DialCallDuration, 10) : call.duration,
          endedAt: DialCallStatus === "completed" ? new Date() : call.endedAt,
        },
      });

      // Publish event to user
      if (call.userId) {
        publishEvent(call.userId, events.callEnded({
          callSid: CallSid,
          duration: DialCallDuration ? parseInt(DialCallDuration, 10) : undefined,
          disposition: DialCallStatus,
        }));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dial status error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
