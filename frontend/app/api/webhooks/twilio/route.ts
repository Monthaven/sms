/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/utils";
import { logger, generateRequestId } from "@/lib/logger";
import { validateTwilioWebhook, formDataToParams } from "@/lib/twilio-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INBOUND_CAMPAIGN_ID = process.env.INBOUND_CAMPAIGN_ID;

async function ensureContactAndLead(phone: string, log: ReturnType<typeof logger.child>) {
  const contact =
    (await prisma.contact.findUnique({
      where: { phoneE164: phone },
      include: { leads: { orderBy: { createdAt: "desc" }, take: 1 } },
    })) ||
    (await prisma.contact.create({
      data: { phoneE164: phone, source: "INBOUND" },
    }));

  const leadCandidate =
    "leads" in contact && Array.isArray((contact as any).leads)
      ? (contact as any).leads[0] || null
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
    log.info("Created new lead for inbound contact", { contactId: contact.id, leadId: lead.id });
  }

  return { contactId: contact.id, leadId: lead.id };
}

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/webhooks/twilio", requestId });
  
  try {
    const form = await request.formData();
    const params = formDataToParams(form);
    
    // Validate Twilio signature
    const signatureValidation = validateTwilioWebhook(request, params);
    if (!signatureValidation.valid) {
      log.warn("Invalid Twilio signature");
      return NextResponse.json({ error: signatureValidation.error || "Invalid signature" }, { status: 401 });
    }
    
    const fromRaw = params["From"] ?? "";
    const toRaw = params["To"] ?? "";
    const body = params["Body"] ?? "";
    const sid = params["MessageSid"] ?? undefined;

    const from = normalizePhone(fromRaw);
    const to = normalizePhone(toRaw);

    if (!from) {
      log.warn("Invalid From number", { fromRaw });
      return NextResponse.json({ error: "Missing or invalid From" }, { status: 400 });
    }

    log.info("Processing Twilio inbound", { from, to, hasBody: !!body, sid });

    // Check for duplicate by externalId
    if (sid) {
      const existing = await prisma.interaction.findFirst({ where: { externalId: sid } });
      if (existing) {
        log.debug("Duplicate message, skipping", { sid });
        return new NextResponse("<Response/>", {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }
    }

    // Write webhook log
    await prisma.webhookLog.create({
      data: {
        provider: "TWILIO",
        direction: "INBOUND",
        status: "RECEIVED",
        statusCode: 200,
        payload: params,
      },
    });

    const { contactId, leadId } = await ensureContactAndLead(from, log);

    // Insert interaction
    await prisma.interaction.create({
      data: {
        contactId,
        channel: "TWILIO",
        direction: "INBOUND",
        body: body || "(no body)",
        externalId: sid,
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "CONVERSATION_ACTIVE",
      },
    });

    log.info("Twilio webhook processed successfully", { contactId, leadId });

    return new NextResponse("<Response/>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err: any) {
    log.error("Twilio webhook error", {}, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
