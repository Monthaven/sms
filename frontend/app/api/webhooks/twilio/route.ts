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
import { sendPushToUser } from "@/lib/push-notifications";
import { validateTwilioWebhook, formDataToParams } from "@/lib/twilio-webhook";
import { notifications } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INBOUND_CAMPAIGN_ID = process.env.INBOUND_CAMPAIGN_ID;

async function resolveInboundCampaignId(log: ReturnType<typeof logger.child>): Promise<string> {
  if (INBOUND_CAMPAIGN_ID) {
    const exists = await prisma.campaign.findUnique({
      where: { id: INBOUND_CAMPAIGN_ID },
      select: { id: true },
    });
    if (exists?.id) {
      return exists.id;
    }
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

  const fallbackName = "Inbound Calls";
  const fallback = await prisma.campaign.findFirst({
    where: { name: fallbackName },
    select: { id: true },
  });
  if (fallback?.id) return fallback.id;

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
    const campaignId = await resolveInboundCampaignId(log);
    lead = await prisma.lead.create({
      data: {
        campaignId,
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

    // Get contact info for notification
    const contactInfo = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { firstName: true, lastName: true, phoneE164: true },
    });
    
    // Get assigned agent for the lead to send notification
    const leadWithAgent = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { assignedToId: true },
    });
    
    // Send notification for new message to assigned agent
    if (leadWithAgent?.assignedToId) {
      const contactName = contactInfo 
        ? `${contactInfo.firstName || ''} ${contactInfo.lastName || ''}`.trim() || from
        : from;
      const preview = body ? body.substring(0, 100) + (body.length > 100 ? '...' : '') : 'New message received';
      
      await notifications.newMessage(
        leadWithAgent.assignedToId,
        contactName,
        preview,
        leadId
      );

      // Fire push notification
      await sendPushToUser(leadWithAgent.assignedToId, {
        title: `New SMS from ${contactName}`,
        body: preview,
        data: { type: "NEW_MESSAGE", contactId, leadId },
      });
    }

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
