/**
 * PROPRIETARY — Always Improving LLC
 * Twilio Voice Inbound Call Handler
 * Routes incoming calls to available agents with round-robin distribution
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateTwilioWebhook, formDataToParams } from "@/lib/twilio-webhook";
import { normalizePhone } from "@/lib/utils";
import { logger, generateRequestId } from "@/lib/logger";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INBOUND_CAMPAIGN_ID = process.env.INBOUND_CAMPAIGN_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sms.monthavencapital.com";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/twilio/voice/inbound", requestId });

  try {
    const form = await req.formData();
    const params = formDataToParams(form);

    // Validate Twilio signature
    const signatureValidation = validateTwilioWebhook(req, params);
    if (!signatureValidation.valid) {
      log.warn("Invalid Twilio signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const from = params["From"] || "";
    const to = params["To"] || "";
    const callSid = params["CallSid"] || "";

    const normalizedFrom = normalizePhone(from);
    log.info("Inbound call received", { from: normalizedFrom, to, callSid });

    if (!normalizedFrom) {
      log.warn("Invalid from phone number", { from });
      const twiml = new VoiceResponse();
      twiml.say("Sorry, we could not identify your phone number.");
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // 1. Lookup or create contact
    let contact = await prisma.contact.findFirst({
      where: { phoneE164: normalizedFrom },
      include: { leads: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phoneE164: normalizedFrom,
          source: "INBOUND_CALL",
          callConsent: true,
          callConsentAt: new Date(),
          callConsentSource: "INBOUND",
        },
        include: { leads: true },
      });
      log.info("Created new contact for inbound call", { contactId: contact.id });
    }

    // 2. Find available agent (round-robin by idle time)
    const agent = await prisma.user.findFirst({
      where: {
        role: { in: ["CALLER", "AGENT"] },
        isOnline: true,
        currentCallId: null,
        status: { not: "ON_BREAK" },
        acceptsInbound: true,
      },
      orderBy: { lastActiveAt: "asc" },
    });

    // 3. Build TwiML response
    const twiml = new VoiceResponse();

    // Recording consent announcement (TCPA compliance)
    twiml.say({
      voice: "Polly.Matthew",
      language: "en-US",
    }, "This call may be recorded for quality assurance and training purposes.");

    if (agent) {
      // Mark agent as on call
      await prisma.user.update({
        where: { id: agent.id },
        data: { currentCallId: callSid, status: "ON_CALL", statusSince: new Date() },
      });

      log.info("Routing call to agent", { agentId: agent.id, agentName: agent.name });

      // Check if agent has forwarding enabled
      if (agent.forwardNumber) {
        const dial = twiml.dial({
          callerId: to,
          action: `${APP_URL}/api/twilio/voice/dial-status`,
          timeout: 30,
        });
        dial.number({
          statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
          statusCallback: `${APP_URL}/api/twilio/voice/status`,
        }, agent.forwardNumber);
      } else {
        // Route to browser client
        const dial = twiml.dial({
          callerId: to,
          action: `${APP_URL}/api/twilio/voice/dial-status`,
          timeout: 30,
        });
        dial.client({
          statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
          statusCallback: `${APP_URL}/api/twilio/voice/status`,
        }, agent.id);
      }
    } else {
      // No agents available - send to voicemail
      log.info("No agents available, routing to voicemail");
      twiml.say({
        voice: "Polly.Matthew",
        language: "en-US",
      }, "All of our team members are currently assisting other callers. Please leave a message after the beep, and we will return your call as soon as possible.");

      twiml.record({
        maxLength: 120,
        action: `${APP_URL}/api/twilio/voice/voicemail`,
        transcribe: true,
        transcribeCallback: `${APP_URL}/api/twilio/voice/transcription`,
        playBeep: true,
      });

      twiml.say("We did not receive your message. Goodbye.");
      twiml.hangup();
    }

    // 4. Create or get lead
    let leadId: string | undefined;
    if (contact) {
      const existingLead = contact.leads?.[0];
      if (existingLead) {
        leadId = existingLead.id;
      } else if (INBOUND_CAMPAIGN_ID) {
        const newLead = await prisma.lead.create({
          data: {
            campaignId: INBOUND_CAMPAIGN_ID,
            contactId: contact.id,
            status: "RESP_HOT",
            assignedToId: agent?.id,
            assignedAt: agent ? new Date() : undefined,
          },
        });
        leadId = newLead.id;
        log.info("Created new lead for inbound call", { leadId });
      }
    }

    // 5. Log the call
    await prisma.call.create({
      data: {
        twilioCallSid: callSid,
        direction: "INBOUND",
        status: "ringing",
        fromNumber: from,
        toNumber: to,
        contactId: contact?.id,
        userId: agent?.id || "system",
        leadId,
      },
    });

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    log.error("Inbound call handler error", { error: error.message });
    
    // Return basic TwiML even on error
    const errorTwiml = new VoiceResponse();
    errorTwiml.say("We're experiencing technical difficulties. Please try again later.");
    errorTwiml.hangup();
    
    return new NextResponse(errorTwiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
