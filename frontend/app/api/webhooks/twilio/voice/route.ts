/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { validateTwilioWebhook, formDataToParams } from "@/lib/twilio-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INBOUND_CAMPAIGN_ID = process.env.INBOUND_CAMPAIGN_ID;

async function ensureContactAndLead(phone: string) {
  const contact =
    (await prisma.contact.findUnique({
      where: { phoneE164: phone },
      include: { leads: { orderBy: { createdAt: "desc" }, take: 1 } },
    })) ||
    (await prisma.contact.create({
      data: { phoneE164: phone, source: "INBOUND" },
    }));

  const leadCandidate =
    "Lead" in contact && Array.isArray((contact as any).Lead)
      ? (contact as any).Lead[0] || null
      : null;

  let lead = leadCandidate;

  if (!lead) {
    if (!INBOUND_CAMPAIGN_ID) {
      throw new Error("Missing INBOUND_CAMPAIGN_ID env for inbound auto-intake");
    }
    lead = await prisma.lead.create({
      data: {
        campaignId: INBOUND_CAMPAIGN_ID,
        contactId: contact.id,
        status: LeadStatus.RESP_HOT,
      },
    });
  }

  return { contactId: contact.id, leadId: lead.id };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const params = formDataToParams(form);
    
    // Validate Twilio signature
    const signatureValidation = validateTwilioWebhook(request, params);
    if (!signatureValidation.valid) {
      return NextResponse.json(
        { error: signatureValidation.error || "Invalid signature" },
        { status: 401 }
      );
    }
    
    const fromRaw = params["From"] ?? "";
    const toRaw = params["To"] ?? "";
    const callSid = params["CallSid"] ?? undefined;
    const callStatus = params["CallStatus"] ?? "";

    const from = normalizePhone(fromRaw);
    const to = normalizePhone(toRaw);

    if (!from) {
      return NextResponse.json({ error: "Missing or invalid From" }, { status: 400 });
    }

    // Always log the webhook payload
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

    const { contactId, leadId } = await ensureContactAndLead(from);

    // Record the call as an interaction
    await prisma.interaction.create({
      data: {
        contactId,
        channel: "TWILIO",
        direction: "INBOUND",
        body: `Inbound voice call from ${from} to ${to || "(unknown)"} (${callStatus || "ringing"})`,
        externalId: callSid,
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "CONVERSATION_ACTIVE" },
    });

    // Respond with TwiML to collect voicemail
    const twiml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<Response>",
      '<Say voice="alice">Thank you for calling Monthaven Capital. Please leave a message after the tone.</Say>',
      '<Record maxLength="120" transcribe="true" transcribeCallback="/api/webhooks/twilio/voice/transcription" />',
      "</Response>",
    ].join("");

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    logger.error("Twilio voice webhook error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
