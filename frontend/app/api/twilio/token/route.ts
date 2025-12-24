/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);
  const log = logger.child({ endpoint: "/api/twilio/token", clientIP });

  // Rate limiting - prevent token generation abuse
  const rateLimit = checkRateLimit(`twilio_token:${clientIP}`, RATE_LIMITS.TOKEN_GEN);
  if (!rateLimit.success) {
    log.warn("Rate limit exceeded for token generation");
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Authentication check
  const user = await getCurrentUser();
  if (!user) {
    log.warn("Unauthorized token request");
    return NextResponse.json(
      { error: "Unauthorized" }, 
      { status: 401, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY_SID;
  const apiSecret = process.env.TWILIO_API_KEY_SECRET;
  const appSid = process.env.TWILIO_TWIML_APP_SID;

  if (!accountSid || !apiKey || !apiSecret || !appSid) {
    log.error("Missing Twilio voice configuration");
    return NextResponse.json(
      { error: "Twilio voice not configured" }, 
      { status: 500, headers: rateLimitHeaders(rateLimit) }
    );
  }

  try {
    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity: user.id,
      ttl: 3600, // 1 hour
    });

    const grant = new VoiceGrant({
      outgoingApplicationSid: appSid,
      incomingAllow: false,
    });

    token.addGrant(grant);

    log.info("Voice token generated", { userId: user.id });
    return NextResponse.json(
      { token: token.toJwt() },
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error: any) {
    log.error("Token generation failed", {}, error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500, headers: rateLimitHeaders(rateLimit) }
    );
  }
}
