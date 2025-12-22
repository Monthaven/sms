/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_MAIN_FROM;

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

export async function sendSMS(to: string, body: string) {
  if (!client) throw new Error("Twilio client not configured");
  return client.messages.create({ to, from: fromNumber, body });
}
