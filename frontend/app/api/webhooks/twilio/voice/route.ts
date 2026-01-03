/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Inbound Voice Call Webhook
 * 
 * When someone calls your Twilio number, this handles:
 * 1. Looks up caller in contacts (creates new if needed)
 * 2. Finds assigned agent or round-robins to available agent
 * 3. Attempts to connect via:
 *    a) Browser (Twilio Client SDK) - if agent is online
 *    b) Forward to agent's cell phone
 *    c) Voicemail if no one answers
 * 4. Sends real-time notification to agent
 * 5. Logs everything
 */

import { NextResponse } from "next/server";
import { LeadStatus, UserRole } from "@prisma/client";
import twilio from "twilio";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { validateTwilioWebhook, formDataToParams } from "@/lib/twilio-webhook";
import { notifications } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push-notifications";
import { incrementCounter } from "@/lib/metrics";

const VoiceResponse = twilio.twiml.VoiceResponse;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INBOUND_CAMPAIGN_ID = process.env.INBOUND_CAMPAIGN_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sms.monthavencapital.com";
const AGENT_NAME = process.env.AGENT_NAME || "Monthaven Capital";
const maskPhone = (phone: string | null) => (phone ? `${phone.slice(0, 3)}****${phone.slice(-2)}` : "");

// =============================================================================
// Helper Functions
// =============================================================================

async function resolveInboundCampaignId(log: any): Promise<string> {
  // Use configured campaign if it exists
  if (INBOUND_CAMPAIGN_ID) {
    const exists = await prisma.campaign.findUnique({
      where: { id: INBOUND_CAMPAIGN_ID },
      select: { id: true },
    });
    if (exists?.id) {
      return exists.id;
    }
    // If configured but missing, create it with that ID so inbound always succeeds
    const created = await prisma.campaign.create({
      data: {
        id: INBOUND_CAMPAIGN_ID,
        name: "Inbound Calls",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    log.warn("Configured INBOUND_CAMPAIGN_ID missing; created fallback campaign", {
      inboundCampaignId: INBOUND_CAMPAIGN_ID,
    });
    return created.id;
  }

  // Fallback to a dedicated inbound campaign (create if missing)
  const fallbackName = "Inbound Calls";
  const fallback = await prisma.campaign.findFirst({
    where: { name: fallbackName },
    select: { id: true },
  });
  if (fallback?.id) {
    return fallback.id;
  }

  const created = await prisma.campaign.create({
    data: {
      name: fallbackName,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Find or create contact and lead for inbound caller
 */
async function ensureContactAndLead(phone: string) {
  // Look up existing contact with leads and assigned agent
  let contact = await prisma.contact.findUnique({
    where: { phoneE164: phone },
    include: { 
      leads: { 
        orderBy: { createdAt: "desc" }, 
        take: 1,
        include: { assignedTo: true }
      } 
    },
  });

  // Create new contact if not found
  if (!contact) {
    contact = await prisma.contact.create({
      data: { 
        phoneE164: phone, 
        source: "INBOUND_CALL",
        firstName: "Unknown",
        lastName: "Caller",
      },
      include: { 
        leads: {
          include: { assignedTo: true }
        }
      },
    });
  }

  // Get existing lead or create new one
  const existingLead = contact.leads?.[0];
  let lead = existingLead;

  if (!lead) {
    const campaignId = await resolveInboundCampaignId(logger.child({ module: "inbound-call" }));
    lead = await prisma.lead.create({
      data: {
        campaignId,
        contactId: contact.id,
        status: LeadStatus.RESP_HOT,
        notes: "Created from inbound call",
      },
      include: { assignedTo: true },
    });
  }

  return { 
    contact, 
    lead,
    assignedAgent: lead.assignedTo || null,
    callerName: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || phone,
  };
}

/**
 * Find the best agent to handle this call
 * Priority: 1) Assigned agent, 2) Round-robin available agents
 */
async function findAvailableAgent(assignedAgent: any) {
  // Prefer assigned agent if they accept inbound and are online or have a forward number
  if (assignedAgent?.acceptsInbound && (assignedAgent?.isOnline || assignedAgent?.forwardNumber)) {
    return assignedAgent;
  }

  // Prefer online agents who accept inbound and have reachable numbers
  const onlineAgents = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.AGENT, UserRole.ADMIN] },
      acceptsInbound: true,
      isOnline: true,
      OR: [
        { forwardNumber: { not: null } },
        { twilioNumber: { not: null } },
      ],
    },
    orderBy: { lastActiveAt: "desc" },
    take: 5,
  });

  if (onlineAgents.length > 0) {
    return onlineAgents[Math.floor(Math.random() * onlineAgents.length)];
  }

  // Fallback to any accepting agent with numbers
  const availableAgents = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.AGENT, UserRole.ADMIN] },
      acceptsInbound: true,
      OR: [
        { forwardNumber: { not: null } },
        { twilioNumber: { not: null } },
      ],
    },
    orderBy: { lastLoginAt: "desc" },
    take: 5,
  });

  if (availableAgents.length === 0) {
    return null;
  }

  return availableAgents[Math.floor(Math.random() * availableAgents.length)];
}

/**
 * Build TwiML response for inbound call
 */
function buildInboundTwiML(
  callerName: string,
  callerPhone: string,
  agent: { id: string; name?: string | null; forwardNumber?: string | null; email: string } | null,
  callSid: string,
  leadId: string
): string {
  const response = new VoiceResponse();

  if (!agent) {
    // No agents available - go straight to voicemail
    response.say(
      { voice: "Polly.Joanna" },
      `Thank you for calling ${AGENT_NAME}. All of our agents are currently unavailable. Please leave a message after the tone.`
    );
    response.record({
      maxLength: 120,
      transcribe: true,
      transcribeCallback: `${APP_URL}/api/webhooks/twilio/voice/transcription`,
      recordingStatusCallback: `${APP_URL}/api/webhooks/twilio/voice/recording`,
      playBeep: true,
    });
    response.say({ voice: "Polly.Joanna" }, "Thank you. Goodbye.");
    response.hangup();
    return response.toString();
  }

  // Build dial options
  const dialOptions: any = {
    callerId: callerPhone, // Show caller's number to agent
    timeout: 25, // Ring for 25 seconds
    action: `${APP_URL}/api/webhooks/twilio/voice/dial-status?leadId=${leadId}&callSid=${callSid}`,
    method: "POST",
  };

  const dial = response.dial(dialOptions);

  // Try browser first (Twilio Client), then forward number
  // Browser client identity is based on user ID
  dial.client(
    {
      statusCallback: `${APP_URL}/api/webhooks/twilio/voice/client-status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    },
    `user_${agent.id}`
  );

  // If agent has a forward number, also ring that
  if (agent.forwardNumber) {
    dial.number(
      {
        statusCallback: `${APP_URL}/api/webhooks/twilio/voice/number-status`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        // Whisper to agent before connecting
        url: `${APP_URL}/api/webhooks/twilio/voice/whisper?caller=${encodeURIComponent(callerName)}`,
      },
      agent.forwardNumber
    );
  }

  return response.toString();
}

// =============================================================================
// Main Handler
// =============================================================================

export async function POST(request: Request) {
  const log = logger.child({ handler: "inbound-voice" });

  try {
    const form = await request.formData();
    const params = formDataToParams(form);

    // Validate Twilio signature
    const signatureValidation = validateTwilioWebhook(request, params);
    if (!signatureValidation.valid) {
      incrementCounter("twilio.voice.inbound.invalid_signature");
      log.warn("Invalid Twilio signature on inbound call");
      return NextResponse.json(
        { error: signatureValidation.error || "Invalid signature" },
        { status: 401 }
      );
    }

    const fromRaw = params["From"] ?? params["Caller"] ?? "";
    const toRaw = params["To"] ?? params["Called"] ?? "";
    const callSid = params["CallSid"] ?? "";
    const callStatus = params["CallStatus"] ?? "ringing";

    const callerPhone = normalizePhone(fromRaw) || (fromRaw ? fromRaw : null);
    const toNumber = normalizePhone(toRaw);

    if (!callerPhone) {
      log.warn("Inbound call missing From number", { fromRaw });
      const response = new VoiceResponse();
      response.say(
        { voice: "Polly.Joanna" },
        `Thank you for calling ${AGENT_NAME}. We could not identify the caller.`
      );
      response.record({
        maxLength: 120,
        transcribe: true,
        transcribeCallback: `${APP_URL}/api/webhooks/twilio/voice/transcription`,
        recordingStatusCallback: `${APP_URL}/api/webhooks/twilio/voice/recording`,
        playBeep: true,
      });
      response.hangup();
      return new NextResponse(response.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    log.info("Inbound call received", { from: maskPhone(callerPhone), to: maskPhone(toNumber), callSid });

    // Log the webhook
    try {
      await prisma.webhookLog.create({
        data: {
          provider: "TWILIO",
          direction: "INBOUND",
          status: "RECEIVED",
          statusCode: 200,
          payload: Object.fromEntries(
            Array.from(form.entries()).map(([k, v]) => [k, typeof v === "string" ? v : `${v}`])
          ),
        },
      });
    } catch (logErr) {
      log.warn("Failed to persist webhook log (continuing)", { error: (logErr as any)?.message });
    }

    // Find/create contact and lead
    const { contact, lead, assignedAgent, callerName } = await ensureContactAndLead(callerPhone);

    // Find available agent
    const agent = await findAvailableAgent(assignedAgent);

    incrementCounter("twilio.voice.inbound.received");
    log.info("Inbound call linked", {
      callSid,
      contactId: contact.id,
      leadId: lead.id,
      agentId: agent?.id || null,
      caller: maskPhone(callerPhone),
      to: maskPhone(toNumber),
    });

    // Create call record
    let callRecord: any = null;
    try {
      callRecord = await prisma.call.create({
        data: {
          leadId: lead.id,
          contactId: contact.id,
          userId: agent?.id || (await getDefaultUserId()),
          direction: "inbound",
          status: "ringing",
          twilioCallSid: callSid,
          startedAt: new Date(),
          notes: `Inbound from ${callerName}`,
        },
      });
    } catch (callErr) {
      log.warn("Failed to create call record (continuing)", { error: (callErr as any)?.message });
    }

    // Record interaction
    try {
      await prisma.interaction.create({
        data: {
          contactId: contact.id,
          channel: "TWILIO",
          direction: "INBOUND",
          body: `Inbound call from ${callerName} (${callerPhone}) to ${toNumber}`,
          externalId: callSid,
        },
      });
    } catch (interactionErr) {
      log.warn("Failed to create interaction (continuing)", { error: (interactionErr as any)?.message });
    }

    // Update lead status
    try {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { 
          status: LeadStatus.RESP_HOT,
        },
      });
    } catch (leadErr) {
      log.warn("Failed to update lead status (continuing)", { error: (leadErr as any)?.message, leadId: lead.id });
    }

    // Update contact's last contacted timestamp
    try {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { lastContactedAt: new Date() },
      });
    } catch (contactErr) {
      log.warn("Failed to update contact timestamp (continuing)", { error: (contactErr as any)?.message });
    }

    // Send notification to agent(s)
    try {
      if (agent) {
        await notifications.incomingCall(
          agent.id,
          callerName,
          callSid
        );
        await sendPushToUser(agent.id, {
          title: "Incoming Call",
          body: `${callerName || "Unknown"} is calling`,
          data: { type: "INCOMING_CALL", callSid, leadId: lead.id },
        });
        log.info("Notification sent to agent", { agentId: agent.id, agentName: agent.name });
      } else {
        // Notify all admins if no agent available
        const admins = await prisma.user.findMany({
          where: { role: UserRole.ADMIN },
          select: { id: true },
        });
        for (const admin of admins) {
          await notifications.send(`user:${admin.id}`, {
            type: "call_incoming",
            title: "Missed Inbound Call",
            message: `Call from ${callerName} - no agents available`,
            data: { callSid, callerPhone, leadId: lead.id },
          });
          await sendPushToUser(admin.id, {
            title: "Missed Inbound Call",
            body: `${callerName || "Unknown"} called`,
            data: { type: "INCOMING_CALL", callSid, leadId: lead.id },
          });
        }
      }
    } catch (notifyErr) {
      log.warn("Notification step failed (continuing)", { error: (notifyErr as any)?.message });
    }

    // Build TwiML response
    const twiml = buildInboundTwiML(callerName, callerPhone, agent, callSid, lead.id);

    log.info("Inbound call TwiML generated", {
      hasAgent: !!agent,
      agentId: agent?.id,
      leadId: lead.id,
    });

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    log.error("Inbound voice webhook error", {}, err as Error);

    // Return voicemail TwiML on error
    const response = new VoiceResponse();
    response.say(
      { voice: "Polly.Joanna" },
      `Thank you for calling ${AGENT_NAME}. We're experiencing technical difficulties. Please leave a message.`
    );
    response.record({ maxLength: 120, transcribe: true });
    response.hangup();

    return new NextResponse(response.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

// Helper to get a default user ID for orphan calls
async function getDefaultUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
    select: { id: true },
  });
  if (admin?.id) return admin.id;

  const anyUser = await prisma.user.findFirst({ select: { id: true } });
  if (anyUser?.id) return anyUser.id;

  // No users yet; use a system placeholder to avoid throwing
  return "system";
}
