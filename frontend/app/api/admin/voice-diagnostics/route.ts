/**
 * PROPRIETARY ƒ?" Always Improving LLC
 * Copyright Ac 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement A8.3.
 *
 * Admin Voice Diagnostics
 * - GET: Run the existing Twilio voice health check
 * - POST: Place a Twilio test call against the outbound-connect webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getTwilioClientSafe } from "@/lib/twilio-client";

const TEST_NUMBER = "+15005550006"; // Twilio magic test number

function getBaseUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const { origin } = new URL(request.url);
  return origin.replace(/\/$/, "");
}

function getFromNumber(): string | null {
  return (
    process.env.TWILIO_MAIN_FROM ||
    process.env.TWILIO_FROM_NUMBER ||
    process.env.TWILIO_PHONE_NUMBER ||
    null
  );
}

async function runHealthCheck(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  try {
    const res = await fetch(`${baseUrl}/api/twilio/voice/health`, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    const body = await res.json();
    return {
      ok: res.ok && Boolean(body?.ok),
      status: res.status,
      payload: body,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      payload: { error: err?.message || "Health check failed" },
    };
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const health = await runHealthCheck(request);
  return NextResponse.json({ health });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = logger.child({ endpoint: "/api/admin/voice-diagnostics", userId: user.id });

  const { action } = await request.json().catch(() => ({ action: "outbound-test" }));

  if (action !== "outbound-test") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const client = getTwilioClientSafe();
  const fromNumber = getFromNumber();
  const baseUrl = getBaseUrl(request);

  if (!client) {
    return NextResponse.json({ error: "Twilio credentials are not configured" }, { status: 400 });
  }

  if (!fromNumber) {
    return NextResponse.json({ error: "No caller ID configured (TWILIO_MAIN_FROM/TWILIO_FROM_NUMBER)" }, { status: 400 });
  }

  if (!baseUrl) {
    return NextResponse.json({ error: "App URL is not configured" }, { status: 400 });
  }

  try {
    const call = await client.calls.create({
      to: TEST_NUMBER,
      from: fromNumber,
      url: `${baseUrl}/api/twilio/voice/outbound-connect`,
      statusCallback: `${baseUrl}/api/twilio/voice/dial-status?leadId=test-admin`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      record: "false",
    });

    log.info("Placed Twilio outbound test call", { callSid: call.sid, to: TEST_NUMBER });

    return NextResponse.json({
      ok: true,
      callSid: call.sid,
      to: TEST_NUMBER,
      from: fromNumber,
      voiceUrl: `${baseUrl}/api/twilio/voice/outbound-connect`,
      statusCallback: `${baseUrl}/api/twilio/voice/dial-status?leadId=test-admin`,
    });
  } catch (error: any) {
    log.error("Outbound test call failed", { error: error?.message || String(error) });
    return NextResponse.json(
      { error: error?.message || "Failed to place Twilio test call" },
      { status: 500 }
    );
  }
}
