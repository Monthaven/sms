/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import crypto from "crypto";
import { logger } from "./logger";

/**
 * Validates Twilio webhook signatures to prevent spoofed requests.
 * 
 * @param authToken - Twilio Auth Token
 * @param signature - X-Twilio-Signature header value
 * @param url - Full webhook URL
 * @param params - Form/body parameters from the request
 * @returns boolean - true if signature is valid
 */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // Build the data string by sorting params alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "");
  
  const data = url + sortedParams;
  
  // Generate expected signature
  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return false;
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Helper to validate Twilio webhook requests with logging.
 * Respects VALIDATE_TWILIO_SIGNATURE env var for toggling.
 * 
 * @param request - The incoming Request object
 * @param params - Parsed form/body parameters
 * @returns { valid: boolean, error?: string }
 */
export function validateTwilioWebhook(
  request: Request,
  params: Record<string, string>
): { valid: boolean; error?: string } {
  const log = logger.child({ module: "twilio-webhook-validation" });
  
  // Check if validation is enabled
  const validateEnabled = process.env.VALIDATE_TWILIO_SIGNATURE === "true";
  
  if (!validateEnabled) {
    log.debug("Twilio signature validation disabled");
    return { valid: true };
  }
  
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioSignature = request.headers.get("X-Twilio-Signature");
  
  if (!authToken) {
    log.warn("TWILIO_AUTH_TOKEN not configured for signature validation");
    return { valid: false, error: "Server misconfigured" };
  }
  
  if (!twilioSignature) {
    log.warn("Missing X-Twilio-Signature header");
    return { valid: false, error: "Missing signature" };
  }
  
  // Use configured webhook URL or fall back to request URL
  const requestUrl = process.env.TWILIO_WEBHOOK_URL || request.url;
  
  const isValid = validateTwilioSignature(authToken, twilioSignature, requestUrl, params);
  
  if (!isValid) {
    log.warn("Invalid Twilio signature", { 
      url: requestUrl,
      signaturePresent: !!twilioSignature 
    });
    return { valid: false, error: "Invalid signature" };
  }
  
  log.debug("Twilio signature validated successfully");
  return { valid: true };
}

/**
 * Parse FormData to a Record<string, string> for signature validation
 */
export function formDataToParams(form: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = typeof value === "string" ? value : `${value}`;
  });
  return params;
}
