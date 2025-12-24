/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { PrismaClient } from "@prisma/client";
import twilio from "twilio";

const prisma = new PrismaClient();

// Initialize Twilio client lazily
let _twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!_twilioClient) {
    _twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return _twilioClient;
}

export type SMSProvider = "twilio" | "eztexting";

export type SendSMSParams = {
  leadId?: string;
  to: string;
  message: string;
  provider: SMSProvider;
};

export type SendSMSResult = {
  success: boolean;
  provider: SMSProvider;
  externalId?: string | null;
  error?: string;
};

/**
 * Send SMS via Twilio or EzTexting
 * This is the core SMS sending function used by both API routes and server actions
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  const { leadId, to, message, provider } = params;

  if (!to || !message) {
    return { success: false, provider, error: "Missing required fields: to, message" };
  }

  let externalId: string | null = null;
  let channel: "TWILIO" | "EZTEXTING" = "TWILIO";

  try {
    if (provider === "twilio") {
      // Send via Twilio
      const twilioFrom = process.env.TWILIO_FROM_NUMBER;
      if (!twilioFrom) {
        return { success: false, provider, error: "Twilio not configured - missing TWILIO_FROM_NUMBER" };
      }

      const twilioClient = getTwilioClient();
      const twilioMsg = await twilioClient.messages.create({
        body: message,
        to: to,
        from: twilioFrom,
      });

      externalId = twilioMsg.sid;
      channel = "TWILIO";
      console.log(`✅ Twilio SMS sent: ${twilioMsg.sid}`);
      
    } else if (provider === "eztexting") {
      // Send via EzTexting API
      const ezUser = process.env.EZTEXTING_USER;
      const ezPass = process.env.EZTEXTING_PASS || process.env.EZTEXTING_PASSWORD;
      const ezApiBase = process.env.EZTEXTING_API_BASE || "https://a.eztexting.com/v1";

      if (!ezUser || !ezPass) {
        return { success: false, provider, error: "EzTexting not configured - missing credentials" };
      }

      // EzTexting API v1 - using their documented endpoint
      const cleanPhone = to.replace("+1", "").replace(/\D/g, ""); // 10-digit only
      const ezResponse = await fetch(
        `${ezApiBase}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${ezUser}:${ezPass}`).toString("base64")}`,
          },
          body: JSON.stringify({
            toNumbers: [cleanPhone], // EzTexting expects toNumbers field
            message: message,
          }),
        }
      );

      const responseText = await ezResponse.text();
      console.log("EzTexting response:", ezResponse.status, responseText);

      if (!ezResponse.ok) {
        console.error("EzTexting error:", responseText);
        return { success: false, provider, error: `EzTexting send failed: ${responseText || ezResponse.status}` };
      }

      let ezData;
      try {
        ezData = JSON.parse(responseText);
      } catch {
        ezData = { id: `ez_${Date.now()}` };
      }
      externalId = ezData.id || `ez_${Date.now()}`;
      channel = "EZTEXTING";
      console.log(`✅ EzTexting SMS sent: ${externalId}`);
      
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
    };
  } catch (error: any) {
    console.error("SMS send error:", error);
    return {
      success: false,
      provider,
      error: error?.message || "Failed to send SMS",
    };
  }
}
