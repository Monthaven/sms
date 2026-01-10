/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { Direction, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/utils";
import { logger, generateRequestId } from "@/lib/logger";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Intent keywords (case-insensitive)
const INTENT_KEYWORDS = {
  HOT: [
    "interested",
    "yes",
    "call me",
    "send info",
    "what price",
    "how much",
    "make offer",
    "ready to sell",
    "let's talk",
    "send details",
    "more info",
    "tell me more",
  ],
  WARM: [
    "maybe",
    "depends",
    "not sure",
    "thinking",
    "possibly",
    "what are you offering",
    "who is this",
    "how did you get my number",
  ],
  NEGATIVE: [
    "stop",
    "remove",
    "unsubscribe",
    "not interested",
    "no thanks",
    "don't contact",
    "wrong number",
    "not selling",
    "take me off",
    "leave me alone",
    "do not contact",
    "sold already",
  ],
};

function classifyIntent(messageText: string): "HOT" | "WARM" | "NEGATIVE" | "NEUTRAL" {
  const text = (messageText || "").toLowerCase();
  if (INTENT_KEYWORDS.NEGATIVE.some((kw) => text.includes(kw))) return "NEGATIVE";
  if (INTENT_KEYWORDS.HOT.some((kw) => text.includes(kw))) return "HOT";
  if (INTENT_KEYWORDS.WARM.some((kw) => text.includes(kw))) return "WARM";
  return "NEUTRAL";
}

type Payload = {
  fromNumber: string | null;
  message: string | null;
  id?: string | null;
  type?: string | null;
  raw: any;
};

const INBOUND_CAMPAIGN_ID = process.env.INBOUND_CAMPAIGN_ID;

async function ensureContactAndLead(phone: string) {
  type ContactWithLead = Prisma.ContactGetPayload<{ include: { Lead: true } }>;

  let contact: ContactWithLead | null = await prisma.contact.findUnique({
    where: { phoneE164: phone },
    include: { Lead: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: { id: randomUUID(), phoneE164: phone, source: "INBOUND", updatedAt: new Date() },
      include: { Lead: true },
    });
  }

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
        id: randomUUID(),
        campaignId: INBOUND_CAMPAIGN_ID,
        contactId: contact.id,
        status: LeadStatus.RESP_HOT,
        updatedAt: new Date(),
      },
    });
  }

  return { contactId: contact.id, leadId: lead.id };
}

async function parsePayload(req: Request): Promise<Payload> {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const params = url.searchParams;
    const raw: any = Object.fromEntries(params.entries());
    return {
      fromNumber:
        raw.fromNumber ||
        raw.from ||
        raw.From ||
        raw.phone ||
        raw.Phone ||
        null,
      message: raw.message || raw.body || raw.Body || null,
      id: raw.id || raw.ID || raw.MessageSid || null,
      type: raw.type || "inbound_text",
      raw,
    };
  }

  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const body = await req.json();
    return {
      fromNumber:
        body.fromNumber ||
        body.from ||
        body.From ||
        body.phone ||
        body.Phone ||
        null,
      message: body.message || body.body || body.Body || null,
      id: body.id || body.ID || body.MessageSid || null,
      type: body.type || "inbound_text",
      raw: body,
    };
  }

  const form = await req.formData();
  const raw: any = Object.fromEntries(form.entries());
  return {
    fromNumber:
      raw.fromNumber ||
      raw.from ||
      raw.From ||
      raw.phone ||
      raw.Phone ||
      null,
    message: raw.message || raw.body || raw.Body || null,
    id: raw.id || raw.ID || raw.MessageSid || null,
    type: raw.type || "inbound_text",
    raw,
  };
}

async function handle(req: Request) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/webhooks/eztexting", requestId });
  
  let body: any = null;

  const recordLog = async (data: {
    status: string;
    statusCode?: number;
    errorMessage?: string | null;
  }) => {
    try {
      await prisma.webhookLog.create({
        data: {
          id: randomUUID(),
          provider: "EZTEXTING",
          direction: Direction.INBOUND,
          payload: body,
          ...data,
        },
      });
    } catch (logError) {
      log.error("Failed to write webhook log", {}, logError as Error);
    }
  };

  try {
    const payload = await parsePayload(req);
    body = payload.raw;
    const { fromNumber, message, type, id } = payload;

    log.info("Processing EzTexting inbound", { fromNumber, type, hasMessage: !!message });

    if (id) {
      const existing = await prisma.interaction.findFirst({ where: { externalId: id } });
      if (existing) {
        log.debug("Duplicate message, skipping", { externalId: id });
        await recordLog({ status: "duplicate", statusCode: 200 });
        return NextResponse.json({ status: "skipped_duplicate" });
      }
    }

    if (type === "inbound_text") {
      const normalized = normalizePhone(fromNumber);
      if (!normalized) {
        log.warn("Invalid phone number", { fromNumber });
        await recordLog({ status: "invalid_phone", statusCode: 400, errorMessage: "Invalid phone number" });
        return NextResponse.json({ error: "Invalid Phone" }, { status: 400 });
      }

      let { contactId, leadId } = await ensureContactAndLead(normalized);

      let status: LeadStatus = LeadStatus.RESP_WARM;
      const lower = (message || "").toLowerCase();
      if (["stop", "cancel", "unsubscribe"].some((w) => lower.includes(w))) status = LeadStatus.RESP_STOP;
      if (["price", "offer", "selling", "how much"].some((w) => lower.includes(w))) status = LeadStatus.RESP_HOT;
      const intent = classifyIntent(message || "");

      log.debug("Classified intent", { intent, status, contactId });

      await prisma.lead.update({ where: { id: leadId }, data: { status } });

      await prisma.interaction.create({
        data: {
          id: randomUUID(),
          contactId,
          channel: "EZTEXTING",
          direction: "INBOUND",
          body: message || "(no body)",
          externalId: id || `sim_${Date.now()}`,
        },
      });

      await prisma.message.create({
        data: {
          id: crypto.randomUUID(),
          updatedAt: new Date(),
          phone: normalized,
          direction: "INBOUND",
          body: message || "(no body)",
          status: status,
          provider: "EZTEXTING",
          external_id: id || `sim_${Date.now()}`,
          campaign_id: INBOUND_CAMPAIGN_ID || null,
          contactId,
          intent,
        } 
      });

      if (intent === "NEGATIVE") {
        await prisma.phoneFlag.upsert({
          where: { phone: normalized },
          update: { opt_out: true, intent: "NEGATIVE", intent_updated: new Date() },
          create: { id: crypto.randomUUID(), updatedAt: new Date(), phone: normalized, opt_out: true, intent: "NEGATIVE", intent_updated: new Date() },
        });
        log.info("Marked contact as opt-out", { phone: normalized });
      }
    }

    await recordLog({ status: "success", statusCode: 200 });
    log.info("EzTexting webhook processed successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("EzTexting webhook error", {}, error as Error);
    await recordLog({
      status: "error",
      statusCode: 500,
      errorMessage: (error as Error)?.message?.slice(0, 500),
    });
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
