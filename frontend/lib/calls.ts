/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Unified Call Utility
 * All outbound calls go through Twilio.
 * Provides consistent call initiation, logging, and tracking.
 */

import twilio from "twilio";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type CallStatus = 
  | "INITIATED"
  | "RINGING"
  | "CONNECTED"
  | "COMPLETED"
  | "FAILED"
  | "NO_ANSWER"
  | "BUSY"
  | "VOICEMAIL";

export type CallDirection = "OUTBOUND" | "INBOUND";

export type InitiateCallParams = {
  leadId: string;
  userId: string;
  statusCallbackUrl?: string;
};

export type InitiateCallResult = {
  success: boolean;
  callId?: string;
  twilioCallSid?: string;
  to?: string;
  contactName?: string;
  error?: string;
};

export type LogCallOutcomeParams = {
  callId?: string;
  leadId: string;
  userId: string;
  direction?: CallDirection;
  outcome: string;
  notes?: string;
  duration?: number;
  recordingUrl?: string;
  status?: string; // Lead status to set
};

export type LogCallOutcomeResult = {
  success: boolean;
  callId?: string;
  error?: string;
};

export type CallRecord = {
  id: string;
  leadId: string | null;
  contactId: string | null;
  userId: string;
  direction: string;
  status: string;
  duration: number | null;
  twilioCallSid: string | null;
  recordingUrl: string | null;
  disposition: string | null;
  notes: string | null;
  startedAt: Date;
  answeredAt: Date | null;
  endedAt: Date | null;
};

// ============================================================================
// Twilio Client
// ============================================================================

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_MAIN_FROM || process.env.TWILIO_FROM_NUMBER;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient) {
    if (!accountSid || !authToken || !accountSid.startsWith("AC")) {
      throw new Error("Twilio credentials not configured");
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

export function isVoiceConfigured(): boolean {
  return Boolean(accountSid && authToken && fromNumber && appUrl);
}

// ============================================================================
// Initiate Call
// ============================================================================

/**
 * Initiate an outbound call to a lead via Twilio
 */
export async function initiateCall({
  leadId,
  userId,
  statusCallbackUrl,
}: InitiateCallParams): Promise<InitiateCallResult> {
  try {
    // Validate voice is configured
    if (!isVoiceConfigured()) {
      return { success: false, error: "Voice calling is not configured" };
    }

    if (!fromNumber || !appUrl) {
      return { success: false, error: "Missing TWILIO_FROM_NUMBER or NEXT_PUBLIC_APP_URL" };
    }

    // Get lead and contact
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true },
    });

    if (!lead || !lead.contact?.phoneE164) {
      return { success: false, error: "Lead or phone not found" };
    }

    if (lead.contact.doNotContact) {
      return { success: false, error: "Contact is marked do-not-contact" };
    }

    const to = lead.contact.phoneE164;
    const contactName = lead.contact.firstName ?? lead.contact.full_name ?? "Unknown";

    // Create call record in database
    const call = await prisma.call.create({
      data: {
        leadId,
        contactId: lead.contactId,
        userId,
        direction: "OUTBOUND",
        status: "INITIATED",
        startedAt: new Date(),
      },
    });

    // Initiate Twilio call
    const client = getTwilioClient();
    const callbackUrl = statusCallbackUrl || `${appUrl}/api/webhooks/twilio/voice/status`;
    
    const twilioCall = await client.calls.create({
      from: fromNumber,
      to,
      url: `${appUrl}/api/twilio/voice?to=${encodeURIComponent(to)}`,
      statusCallback: callbackUrl,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });

    // Update call record with Twilio SID
    await prisma.call.update({
      where: { id: call.id },
      data: { twilioCallSid: twilioCall.sid },
    });

    return {
      success: true,
      callId: call.id,
      twilioCallSid: twilioCall.sid,
      to,
      contactName,
    };
  } catch (error) {
    logger.error("initiateCall error", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to initiate call",
    };
  }
}

// ============================================================================
// Initiate Manual Call (to arbitrary number)
// ============================================================================

export type InitiateManualCallParams = {
  to: string;
  userId: string;
  leadId?: string; // Optional - for context linking
  statusCallbackUrl?: string;
};

/**
 * Initiate an outbound call to an arbitrary phone number (manual dialing)
 */
export async function initiateManualCall({
  to,
  userId,
  leadId,
  statusCallbackUrl,
}: InitiateManualCallParams): Promise<InitiateCallResult> {
  try {
    // Validate voice is configured
    if (!isVoiceConfigured()) {
      return { success: false, error: "Voice calling is not configured" };
    }

    if (!fromNumber || !appUrl) {
      return { success: false, error: "Missing TWILIO_FROM_NUMBER or NEXT_PUBLIC_APP_URL" };
    }

    // Sanitize the phone number
    const sanitizedTo = to.replace(/[^\d+]/g, "");
    if (sanitizedTo.length < 7) {
      return { success: false, error: "Invalid phone number" };
    }

    // Format with + if not present
    const formattedTo = sanitizedTo.startsWith("+") ? sanitizedTo : `+1${sanitizedTo}`;

    // Get contactId if leadId is provided
    let contactId: string | null = null;
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { contactId: true },
      });
      contactId = lead?.contactId ?? null;
    }

    // Create call record in database
    const call = await prisma.call.create({
      data: {
        leadId: leadId || null,
        contactId,
        userId,
        direction: "OUTBOUND",
        status: "INITIATED",
        startedAt: new Date(),
        notes: `Manual dial to ${formattedTo}`,
      },
    });

    // Initiate Twilio call
    const client = getTwilioClient();
    const callbackUrl = statusCallbackUrl || `${appUrl}/api/webhooks/twilio/voice/status`;
    
    const twilioCall = await client.calls.create({
      from: fromNumber,
      to: formattedTo,
      url: `${appUrl}/api/twilio/voice?to=${encodeURIComponent(formattedTo)}`,
      statusCallback: callbackUrl,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });

    // Update call record with Twilio SID
    await prisma.call.update({
      where: { id: call.id },
      data: { twilioCallSid: twilioCall.sid },
    });

    logger.info("Manual call initiated", {
      callId: call.id,
      to: formattedTo,
      twilioSid: twilioCall.sid,
    });

    return {
      success: true,
      callId: call.id,
      twilioCallSid: twilioCall.sid,
      to: formattedTo,
    };
  } catch (error) {
    logger.error("initiateManualCall error", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to initiate manual call",
    };
  }
}

// ============================================================================
// Log Call Outcome
// ============================================================================

/**
 * Log the outcome of a call (manual logging or after call ends)
 */
export async function logCallOutcome({
  callId,
  leadId,
  userId,
  direction = "OUTBOUND",
  outcome,
  notes,
  duration,
  recordingUrl,
  status,
}: LogCallOutcomeParams): Promise<LogCallOutcomeResult> {
  try {
    let finalCallId = callId;

    // If no callId provided, create a new call record (manual log)
    if (!finalCallId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { contactId: true },
      });

      const call = await prisma.call.create({
        data: {
          leadId,
          contactId: lead?.contactId,
          userId,
          direction,
          status: mapOutcomeToStatus(outcome),
          disposition: outcome,
          notes,
          duration,
          recordingUrl,
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });
      finalCallId = call.id;
    } else {
      // Update existing call record
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: mapOutcomeToStatus(outcome),
          disposition: outcome,
          notes,
          duration,
          recordingUrl,
          endedAt: new Date(),
        },
      });
    }

    // Update lead status if specified
    if (status) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: status as any },
      });
    }

    // Create audit log
    await prisma.leadAudit.create({
      data: {
        leadId,
        userId,
        action: "CALL_OUTCOME",
        details: [
          `Outcome: ${outcome}`,
          notes ? `Notes: ${notes}` : null,
          duration ? `Duration: ${formatDuration(duration)}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
        updatedAt: new Date(),
      },
    });

    return { success: true, callId: finalCallId };
  } catch (error) {
    logger.error("logCallOutcome error", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to log call outcome",
    };
  }
}

// ============================================================================
// Update Call Status (from Twilio webhook)
// ============================================================================

export async function updateCallStatus(
  twilioCallSid: string,
  status: CallStatus,
  duration?: number
): Promise<boolean> {
  try {
    const updateData: any = { status };
    
    if (status === "CONNECTED") {
      updateData.answeredAt = new Date();
    }
    
    if (status === "COMPLETED" || status === "FAILED" || status === "NO_ANSWER") {
      updateData.endedAt = new Date();
      if (duration) {
        updateData.duration = duration;
      }
    }

    await prisma.call.updateMany({
      where: { twilioCallSid },
      data: updateData,
    });

    return true;
  } catch (error) {
    logger.error("updateCallStatus error", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

// ============================================================================
// Get Calls for Lead
// ============================================================================

/**
 * Get all call records for a lead
 */
export async function getCallsForLead(leadId: string): Promise<CallRecord[]> {
  const calls = await prisma.call.findMany({
    where: { leadId },
    orderBy: { startedAt: "desc" },
  });
  return calls;
}

/**
 * Get call by ID
 */
export async function getCallById(callId: string): Promise<CallRecord | null> {
  return prisma.call.findUnique({
    where: { id: callId },
  });
}

/**
 * Get call by Twilio SID
 */
export async function getCallByTwilioSid(twilioCallSid: string): Promise<CallRecord | null> {
  return prisma.call.findUnique({
    where: { twilioCallSid },
  });
}

// ============================================================================
// Helpers
// ============================================================================

function mapOutcomeToStatus(outcome: string): CallStatus {
  const outcomeMap: Record<string, CallStatus> = {
    "Connected - Interested": "COMPLETED",
    "Connected - Not interested": "COMPLETED",
    "Left voicemail": "VOICEMAIL",
    "No answer": "NO_ANSWER",
    "Wrong number": "FAILED",
    "Do not call": "COMPLETED",
  };
  return outcomeMap[outcome] || "COMPLETED";
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
