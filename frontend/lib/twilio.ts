/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import twilio from "twilio";
import crypto from "crypto";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_MAIN_FROM || process.env.TWILIO_FROM_NUMBER;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

let client: ReturnType<typeof twilio> | null = null;

if (accountSid && authToken && accountSid.startsWith("AC")) {
  try {
    client = twilio(accountSid, authToken);
  } catch (err) {
    console.warn("Failed to init Twilio client; outbound SMS disabled", err);
    client = null;
  }
} else {
  console.warn("Twilio environment variables are missing or invalid; outbound SMS will fail.");
}

function getTwilioClient() {
  if (!client) throw new Error("Twilio client not configured");
  return client;
}

export async function sendSMS(to: string, body: string) {
  const twilioClient = getTwilioClient();
  return twilioClient.messages.create({ to, from: fromNumber, body });
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
  const urlObj = new URL(url);
  const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
  const sorted: string[] = [];

  if (params instanceof FormData) {
    Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([k, v]) => {
        sorted.push(k + (typeof v === "string" ? v : `${v}`));
      });
  } else {
    Object.keys(params)
      .sort()
      .forEach((k) => sorted.push(k + params[k]));
  }

  const data = baseUrl + sorted.join("");
  const computed = crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
}
