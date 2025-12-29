/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import crypto from "crypto";

/**
 * Validate Twilio webhook signature using HMAC SHA1
 */
export function validateTwilioWebhook(
  req: Request,
  body: Record<string, string>
): { valid: boolean; error?: string } {
  // Skip validation in development if configured
  if (isDevelopment() && process.env.TWILIO_SKIP_VALIDATION === "true") {
    return { valid: true };
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return { valid: false, error: "TWILIO_AUTH_TOKEN not configured" };
  }

  const twilioSignature = req.headers.get("X-Twilio-Signature");
  if (!twilioSignature) {
    return { valid: false, error: "Missing X-Twilio-Signature header" };
  }

  // Build URL from request
  const url = process.env.TWILIO_WEBHOOK_URL || req.url;

  // Sort body params alphabetically and append to URL
  const sortedParams = Object.keys(body)
    .sort()
    .reduce((acc, key) => acc + key + body[key], "");
  const data = url + sortedParams;

  // Generate expected signature using HMAC SHA1
  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  // Constant-time comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(twilioSignature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Generate Twilio API signature for REST API calls
 */
export function generateApiSignature(
  accountSid: string,
  authToken: string,
  url: string,
  method: string,
  params?: Record<string, string>
): string {
  const sortedParams = params
    ? Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&")
    : "";

  const data = `${method.toUpperCase()}:${url}${sortedParams ? "?" + sortedParams : ""}`;
  
  return crypto
    .createHmac("sha1", authToken)
    .update(data)
    .digest("base64");
}
