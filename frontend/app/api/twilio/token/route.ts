/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import twilio from "twilio";
import { getCurrentUser } from "@/lib/auth";

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY_SID;
  const apiSecret = process.env.TWILIO_API_KEY_SECRET;
  const appSid = process.env.TWILIO_TWIML_APP_SID;

  if (!accountSid || !apiKey || !apiSecret || !appSid) {
    return NextResponse.json({ error: "Missing Twilio voice env vars" }, { status: 500 });
  }

  const token = new AccessToken(accountSid, apiKey, apiSecret, {
    identity: user.id,
    ttl: 3600,
  });

  const grant = new VoiceGrant({
    outgoingApplicationSid: appSid,
    incomingAllow: false,
  });

  token.addGrant(grant);

  return NextResponse.json({ token: token.toJwt() });
}
