/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Twilio Client Helper
 * Provides a singleton Twilio REST client for server-side operations.
 */

import twilio, { Twilio } from "twilio";

let client: Twilio | null = null;

/**
 * Get the Twilio REST API client (singleton)
 */
export function getTwilioClient(): Twilio {
  if (client) {
    return client;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
  }

  client = twilio(accountSid, authToken);
  return client;
}

/**
 * Get Twilio client lazily - returns null if not configured
 */
export function getTwilioClientSafe(): Twilio | null {
  try {
    return getTwilioClient();
  } catch {
    return null;
  }
}

/**
 * Check if Twilio is properly configured
 */
export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN
  );
}

/**
 * Get the default outbound number for Twilio calls/SMS
 */
export function getTwilioFromNumber(): string {
  const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    throw new Error("Missing TWILIO_FROM_NUMBER");
  }
  return fromNumber;
}
