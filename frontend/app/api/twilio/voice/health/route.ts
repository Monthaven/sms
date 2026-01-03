/**
 * PROPRIETARY ƒ?" Always Improving LLC
 * Copyright Ac 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement A8.3.
 *
 * GET /api/twilio/voice/health
 * Verifies TwiML App Voice URL reachability and caller ID ownership.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getTwilioClientSafe } from "@/lib/twilio-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckStatus = "pass" | "warn" | "fail";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = logger.child({ endpoint: "/api/twilio/voice/health", userId: user.id });
  const missingEnv: string[] = [];
  const issues: string[] = [];

  const requiredEnv = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_API_KEY_SID",
    "TWILIO_API_KEY_SECRET",
    "TWILIO_TWIML_APP_SID",
    "NEXT_PUBLIC_APP_URL",
  ];

  for (const key of requiredEnv) {
    if (!process.env[key]) {
      missingEnv.push(key);
    }
  }

  const fromNumber = (
    process.env.TWILIO_MAIN_FROM ||
    process.env.TWILIO_PHONE_NUMBER ||
    process.env.TWILIO_FROM_NUMBER ||
    ""
  ).trim();

  if (!fromNumber) {
    missingEnv.push("TWILIO_MAIN_FROM/TWILIO_PHONE_NUMBER");
  }

  if (missingEnv.length) {
    issues.push(`Missing env vars: ${missingEnv.join(", ")}`);
  }

  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const expectedVoiceUrl = baseUrl ? `${baseUrl}/api/twilio/voice/outbound-connect` : "";

  const client = getTwilioClientSafe();

  let twimlStatus: CheckStatus = missingEnv.length ? "fail" : "pass";
  let twimlVoiceUrl: string | null = null;
  let twimlReachable: boolean | null = null;

  if (!twimlAppSid) {
    twimlStatus = "fail";
    issues.push("TWILIO_TWIML_APP_SID is not set.");
  } else if (!client) {
    twimlStatus = "fail";
    issues.push("Twilio credentials are missing; cannot verify TwiML App.");
  } else {
    try {
      const app = await (client as any).applications(twimlAppSid).fetch();
      twimlVoiceUrl = app?.voiceUrl || null;

      if (!twimlVoiceUrl) {
        twimlStatus = "fail";
        issues.push("TwiML App has no Voice URL configured.");
      } else {
        if (expectedVoiceUrl && !twimlVoiceUrl.startsWith(expectedVoiceUrl)) {
          twimlStatus = "warn";
          issues.push(`TwiML App Voice URL is ${twimlVoiceUrl} (expected ${expectedVoiceUrl}).`);
        }

        try {
          const res = await fetch(twimlVoiceUrl, {
            method: "POST",
            body: new URLSearchParams({ To: "+15005550006" }),
          });
          twimlReachable = res.ok;
          if (!res.ok) {
            twimlStatus = "warn";
            issues.push(`TwiML App Voice URL responded with HTTP ${res.status}.`);
          }
        } catch (err: any) {
          twimlReachable = false;
          twimlStatus = "fail";
          issues.push("TwiML App Voice URL is not reachable from this environment.");
          log.warn("TwiML app voice URL unreachable", { error: err?.message || String(err) });
        }
      }
    } catch (err: any) {
      twimlStatus = "fail";
      issues.push("Unable to fetch TwiML App details from Twilio.");
      log.warn("Failed to fetch TwiML app", { error: err?.message || String(err) });
    }
  }

  let callerIdStatus: CheckStatus = fromNumber ? "pass" : "fail";
  let callerIdSource: "incoming" | "verified" | null = null;

  if (fromNumber && client) {
    try {
      const owned = await client.incomingPhoneNumbers.list({ phoneNumber: fromNumber, limit: 1 });
      if (owned.length > 0) {
        callerIdSource = "incoming";
      } else {
        const verified = await client.outgoingCallerIds.list({ phoneNumber: fromNumber, limit: 1 });
        if (verified.length > 0) {
          callerIdSource = "verified";
        } else {
          callerIdStatus = "fail";
          issues.push(`Caller ID ${fromNumber} is not owned or verified in Twilio.`);
        }
      }
    } catch (err: any) {
      callerIdStatus = "warn";
      issues.push("Unable to verify caller ID ownership with Twilio.");
      log.warn("Caller ID verification failed", { error: err?.message || String(err) });
    }
  } else if (fromNumber && !client) {
    callerIdStatus = "warn";
    issues.push("Twilio credentials missing; skipped caller ID ownership check.");
  } else if (!fromNumber) {
    callerIdStatus = "fail";
    issues.push("No caller ID configured (set TWILIO_MAIN_FROM or TWILIO_PHONE_NUMBER).");
  }

  const configStatus: CheckStatus = missingEnv.length ? "fail" : "pass";
  const ok = configStatus === "pass" && twimlStatus === "pass" && callerIdStatus === "pass";

  return NextResponse.json({
    ok,
    issues,
    details: {
      config: { status: configStatus, missingEnv },
      twimlApp: {
        status: twimlStatus,
        sid: twimlAppSid || null,
        voiceUrl: twimlVoiceUrl,
        expectedVoiceUrl: expectedVoiceUrl || null,
        reachable: twimlReachable,
      },
      callerId: {
        status: callerIdStatus,
        configuredNumber: fromNumber || null,
        source: callerIdSource,
      },
    },
    timestamp: new Date().toISOString(),
  });
}
