import { NextResponse } from "next/server";
import { PrismaClient, LeadStatus } from "@prisma/client";
import { normalizePhone } from "@/lib/utils";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INBOUND_CAMPAIGN_ID = process.env.INBOUND_CAMPAIGN_ID;

async function ensureContactAndLead(phone: string) {
  const contact =
    (await prisma.contact.findUnique({
      where: { phoneE164: phone },
      include: { Lead: { orderBy: { createdAt: "desc" }, take: 1 } },
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
    const fromRaw = (form.get("From") as string) ?? "";
    const toRaw = (form.get("To") as string) ?? "";
    const body = (form.get("Body") as string) ?? "";
    const sid = (form.get("MessageSid") as string) ?? undefined;

    const from = normalizePhone(fromRaw);
    const to = normalizePhone(toRaw);

    if (!from) {
      return NextResponse.json({ error: "Missing or invalid From" }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({
      where: { phoneE164: from },
    });

    // Write webhook log no matter what
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

    return new NextResponse("<Response/>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err: any) {
    console.error("Twilio webhook error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
