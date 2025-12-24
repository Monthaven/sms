/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import twilio from "twilio";
import crypto from "crypto";
import { logger } from "@/lib/logger";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_MAIN_FROM || process.env.TWILIO_FROM_NUMBER;
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

let client: ReturnType<typeof twilio> | null = null;

if (accountSid && authToken && accountSid.startsWith("AC")) {
  try {
    client = twilio(accountSid, authToken);
  } catch (err) {
    logger.warn("Failed to init Twilio client; outbound SMS disabled", { error: err instanceof Error ? err.message : String(err) });
    client = null;
  }
} else {
  logger.warn("Twilio environment variables are missing or invalid; outbound SMS will fail.");
}

function getTwilioClient() {
  if (!client) throw new Error("Twilio client not configured");
  return client;
}

/**
 * @deprecated Use sendSMS from @/lib/sms instead for unified SMS sending
 * This function is kept for backwards compatibility
 */
export async function sendSMS(to: string, body: string) {
  // Re-route to unified SMS utility
  const { sendSMS: unifiedSendSMS } = await import("@/lib/sms");
  const result = await unifiedSendSMS({ to, message: body, provider: "twilio" });
  if (!result.success) {
    throw new Error(result.error || "SMS send failed");
  }
  return { sid: result.externalId };
}

type InitiateCallParams = {
  to: string;
  statusCallbackUrl: string;
};

export async function initiateCall({ to, statusCallbackUrl }: InitiateCallParams) {
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is required for outbound calls");
  if (!fromNumber) throw new Error("TWILIO_FROM_NUMBER (TWILIO_MAIN_FROM or TWILIO_FROM_NUMBER) is required for outbound calls");
  const twilioClient = getTwilioClient();
  return twilioClient.calls.create({
    from: fromNumber,
    to,
    url: `${appUrl}/api/twilio/voice?to=${encodeURIComponent(to)}`,
    statusCallback: statusCallbackUrl,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    statusCallbackMethod: "POST",
  });
}

export function isVoiceConfigured(): boolean {
  return Boolean(accountSid && authToken && fromNumber && appUrl);
}

export function validateTwilioSignature(
  url: string,
  params: Record<string, string> | FormData,
  signature: string | null
): boolean {
  if (!authToken || !signature) return false;
  const payload: Record<string, string> =
    params instanceof FormData
      ? Array.from(params.entries()).reduce<Record<string, string>>((acc, [k, v]) => {
          acc[k] = typeof v === "string" ? v : `${v}`;
          return acc;
        }, {})
      : params;
  return twilio.validateRequest(authToken, signature, url, payload);
}
