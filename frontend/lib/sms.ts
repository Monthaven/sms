/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { prisma } from "@/lib/db";
import twilio from "twilio";
import { withRetry, RETRY_CONFIGS } from "@/lib/retry";
import { logger } from "@/lib/logger";

// Initialize Twilio client lazily (singleton)
let _twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!_twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured");
    }
    
    _twilioClient = twilio(accountSid, authToken);
  }
  return _twilioClient;
}

export type SMSProvider = "twilio" | "eztexting";

export type SendSMSParams = {
  leadId?: string;
  to: string;
  message: string;
  provider: SMSProvider;
  mediaUrls?: string[]; // For MMS support
  fromNumber?: string; // Optional caller ID override
};

export type SendSMSResult = {
  success: boolean;
  provider: SMSProvider;
  externalId?: string | null;
  error?: string;
  isMms?: boolean;
};

/**
 * Normalize phone number to E.164 format
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

/**
 * Send SMS via Twilio with retry logic
 * Supports MMS with mediaUrls parameter
 */
async function sendViaTwilio(
  to: string, 
  message: string, 
  mediaUrls?: string[],
  fromNumber?: string
): Promise<{ sid: string; isMms: boolean }> {
  // Use provided from number or fall back to configured defaults
  const twilioFrom = fromNumber || 
    process.env.TWILIO_SMS_FROM || 
    process.env.TWILIO_FROM_NUMBER || 
    process.env.TWILIO_MAIN_FROM;
    
  if (!twilioFrom) {
    throw new Error("Twilio not configured - missing TWILIO_FROM_NUMBER");
  }

  // Validate media URLs if provided
  const validMediaUrls = mediaUrls?.filter(url => {
    try {
      const parsed = new URL(url);
      // Must be HTTPS and have valid image/video extension or content type query params
      return parsed.protocol === "https:" && 
        (url.match(/\.(jpg|jpeg|png|gif|mp4|mpeg|3gpp)$/i) || 
         url.includes("content-type=image") ||
         url.includes("content-type=video"));
    } catch {
      return false;
    }
  });

  const isMms = validMediaUrls && validMediaUrls.length > 0;
  
  const twilioClient = getTwilioClient();
  
  const result = await withRetry(
    async () => {
      const msgParams: {
        body: string;
        to: string;
        from: string;
        mediaUrl?: string[];
      } = {
        body: message,
        to: normalizePhone(to),
        from: twilioFrom,
      };
      
      // Add media URLs for MMS
      if (isMms) {
        msgParams.mediaUrl = validMediaUrls.slice(0, 10); // Twilio supports up to 10 media URLs
      }
      
      const msg = await twilioClient.messages.create(msgParams);
      return { sid: msg.sid, isMms: !!isMms };
    },
    RETRY_CONFIGS.TWILIO
  );
  
  return result;
}

/**
 * Send SMS via EzTexting with retry logic
 */
async function sendViaEzTexting(to: string, message: string): Promise<string> {
  const ezUser = process.env.EZTEXTING_USER;
  const ezPass = process.env.EZTEXTING_PASS || process.env.EZTEXTING_PASSWORD;
  const ezApiBase = process.env.EZTEXTING_API_BASE || "https://a.eztexting.com/v1";

  if (!ezUser || !ezPass) {
    throw new Error("EzTexting not configured - missing credentials");
  }

  const cleanPhone = to.replace("+1", "").replace(/\D/g, ""); // 10-digit only
  
  const result = await withRetry(
    async () => {
      const response = await fetch(`${ezApiBase}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${ezUser}:${ezPass}`).toString("base64")}`,
        },
        body: JSON.stringify({
          toNumbers: [cleanPhone],
          message: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`EzTexting API error: ${errorText}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json().catch(() => ({ id: `ez_${Date.now()}` }));
      return data.id || `ez_${Date.now()}`;
    },
    RETRY_CONFIGS.EZTEXTING
  );
  
  return result;
}

/**
 * Send SMS via Twilio or EzTexting
 * This is the core SMS sending function used by both API routes and server actions
 * Includes retry logic, MMS support, and proper logging
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  const { leadId, to, message, provider, mediaUrls, fromNumber } = params;
  const log = logger.child({ provider, to: to.slice(-4), leadId });

  if (!to || !message) {
    log.warn("SMS send failed - missing fields");
    return { success: false, provider, error: "Missing required fields: to, message" };
  }

  let externalId: string | null = null;
  let channel: "TWILIO" | "EZTEXTING" = "TWILIO";
  let isMms = false;

  try {
    if (provider === "twilio") {
      const result = await sendViaTwilio(to, message, mediaUrls, fromNumber);
      externalId = result.sid;
      isMms = result.isMms;
      channel = "TWILIO";
      log.info("SMS sent via Twilio", { externalId, isMms });
      
    } else if (provider === "eztexting") {
      externalId = await sendViaEzTexting(to, message);
      channel = "EZTEXTING";
      log.info("SMS sent via EzTexting", { externalId });
      
    } else {
      return { success: false, provider, error: "Invalid provider. Use 'twilio' or 'eztexting'" };
    }

    // Log interaction if leadId provided
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { contactId: true },
      });

      if (lead) {
        await prisma.interaction.create({
          data: {
            contactId: lead.contactId,
            channel: channel,
            direction: "OUTBOUND",
            body: message,
            externalId: externalId,
            // Store media URLs in metadata if MMS
            ...(isMms && mediaUrls && { 
              metadata: JSON.stringify({ mediaUrls, isMms: true }) 
            }),
          },
        });

        // Update lead status to active conversation
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: "CONVERSATION_ACTIVE" },
        });
      }
    }

    return {
      success: true,
      provider,
      externalId,
      isMms,
    };
  } catch (error: any) {
    logger.error("SMS send error", { error: error?.message || String(error), provider });
    return {
      success: false,
      provider,
      error: error?.message || "Failed to send SMS",
    };
  }
}
