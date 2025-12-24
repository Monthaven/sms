/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { sendSMS } from "@/lib/sms";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, to, message, provider } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing required fields: to, message" },
        { status: 400 }
      );
    }

    if (!provider || !["twilio", "eztexting"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Use 'twilio' or 'eztexting'" },
        { status: 400 }
      );
    }

    const result = await sendSMS({
      leadId,
      to,
      message,
      provider,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: result.provider,
      externalId: result.externalId,
    });
  } catch (error) {
    console.error("SMS send error:", error);
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}
