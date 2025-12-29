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

const VoiceResponse = twilio.twiml.VoiceResponse;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INBOUND_CAMPAIGN_ID = process.env.INBOUND_CAMPAIGN_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sms.monthavencapital.com";
const AGENT_NAME = process.env.AGENT_NAME || "Monthaven Capital";

// =============================================================================
// Helper Functions
// =============================================================================

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
    if (!INBOUND_CAMPAIGN_ID) {
      throw new Error("Missing INBOUND_CAMPAIGN_ID env for inbound auto-intake");
    }
    lead = await prisma.lead.create({
      data: {
        campaignId: INBOUND_CAMPAIGN_ID,
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
  // If lead has assigned agent who accepts inbound, use them
  if (assignedAgent?.acceptsInbound && assignedAgent?.forwardNumber) {
    return assignedAgent;
  }

  // Otherwise, round-robin to available agents
  const availableAgents = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.AGENT, UserRole.ADMIN] },
      acceptsInbound: true,
      OR: [
        { forwardNumber: { not: null } },
        { twilioNumber: { not: null } },
      ],
    },
    orderBy: { lastLoginAt: "desc" }, // Prefer recently active agents
    take: 5,
  });

  if (availableAgents.length === 0) {
    return null;
  }

  // Simple round-robin: pick random from available
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
      log.warn("Invalid Twilio signature on inbound call");
      return NextResponse.json(
        { error: signatureValidation.error || "Invalid signature" },
        { status: 401 }
      );
    }

    const fromRaw = params["From"] ?? "";
    const toRaw = params["To"] ?? "";
    const callSid = params["CallSid"] ?? "";
    const callStatus = params["CallStatus"] ?? "ringing";

    const callerPhone = normalizePhone(fromRaw);
    const toNumber = normalizePhone(toRaw);

    if (!callerPhone) {
      log.warn("Inbound call missing From number");
      return NextResponse.json({ error: "Missing From" }, { status: 400 });
    }

    log.info("Inbound call received", { from: callerPhone, to: toNumber, callSid });

    // Log the webhook
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

    // Find/create contact and lead
    const { contact, lead, assignedAgent, callerName } = await ensureContactAndLead(callerPhone);

    // Find available agent
    const agent = await findAvailableAgent(assignedAgent);

    // Create call record
    const callRecord = await prisma.call.create({
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

    // Record interaction
    await prisma.interaction.create({
      data: {
        contactId: contact.id,
        channel: "TWILIO",
        direction: "INBOUND",
        body: `Inbound call from ${callerName} (${callerPhone}) to ${toNumber}`,
        externalId: callSid,
      },
    });

    // Update lead status
    await prisma.lead.update({
      where: { id: lead.id },
      data: { 
        status: LeadStatus.RESP_HOT,
      },
    });

    // Update contact's last contacted timestamp
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastContactedAt: new Date() },
    });

    // Send notification to agent(s)
    if (agent) {
      await notifications.incomingCall(
        agent.id,
        callerName,
        callSid
      );
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
      }
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
  if (!admin) {
    throw new Error("No admin user found for default call assignment");
  }
  return admin.id;
}
