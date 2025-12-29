/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * @deprecated This file is kept for backwards compatibility.
 * Use @/lib/calls.ts for voice calls and @/lib/sms.ts for SMS.
 * The Twilio client is centralized in those modules.
 */

import twilio from "twilio";
import { logger } from "@/lib/logger";

// Re-export from consolidated modules
export { isVoiceConfigured } from "@/lib/calls";

const authToken = process.env.TWILIO_AUTH_TOKEN;

/**
 * @deprecated Use sendSMS from @/lib/sms instead for unified SMS sending
 */
export async function sendSMS(to: string, body: string) {
  const { sendSMS: unifiedSendSMS } = await import("@/lib/sms");
  const result = await unifiedSendSMS({ to, message: body, provider: "twilio" });
  if (!result.success) {
    throw new Error(result.error || "SMS send failed");
  }
  return { sid: result.externalId };
}

/**
 * @deprecated Use initiateCall or initiateManualCall from @/lib/calls instead
 */
export async function initiateCall({ to, statusCallbackUrl }: { to: string; statusCallbackUrl: string }) {
  const { initiateManualCall } = await import("@/lib/calls");
  logger.warn("twilio.ts initiateCall is deprecated - use lib/calls.ts instead");
  
  // This shouldn't be used anymore, but maintain compatibility
  const result = await initiateManualCall({
    to,
    userId: "system",
    statusCallbackUrl,
    webrtc: false, // Force server-side call for legacy compatibility
  });
  
  if (!result.success) {
    throw new Error(result.error || "Call failed");
  }
  
  return { sid: result.twilioCallSid };
}

/**
 * Validate Twilio webhook signature
 * This is the canonical implementation - also available in @/lib/twilio-webhook.ts
 */
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
