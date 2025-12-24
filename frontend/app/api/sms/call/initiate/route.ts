/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Call Initiation API
 * Uses unified lib/calls.ts for all call operations through Twilio.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { initiateCallSchema } from "@/lib/validations";
import { initiateCall } from "@/lib/calls";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = initiateCallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  const { leadId } = parsed.data;

  // Use unified call utility
  const result = await initiateCall({
    leadId,
    userId: user.id,
  });

  if (!result.success) {
    const statusCode = result.error?.includes("not found") ? 404 
      : result.error?.includes("do-not-contact") ? 403 
      : 500;
    return NextResponse.json(
      { success: false, error: { code: "CALL_FAILED", message: result.error } },
      { status: statusCode }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      callId: result.callId,
      twilioCallSid: result.twilioCallSid,
      to: result.to,
      contactName: result.contactName,
    },
  });
}
