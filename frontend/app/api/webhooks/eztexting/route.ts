import { NextResponse } from "next/server";
import { Direction, LeadStatus, PrismaClient } from "@prisma/client";
import { normalizePhone } from "@/lib/utils";

const prisma = new PrismaClient();
const db = prisma as any;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any = null;
  const logDelegate = db?.webhookLog;

  const recordLog = async (data: {
    status: string;
    statusCode?: number;
    errorMessage?: string | null;
  }) => {
    if (!logDelegate) return;
    await logDelegate.create({
      data: {
        provider: "EZTEXTING",
        direction: Direction.INBOUND,
        payload: body,
        ...data,
      },
    });
  };

  try {
    body = await req.json();
    const { fromNumber, message, type, id } = body;

    if (id) {
      const existing = await prisma.interaction.findFirst({ where: { externalId: id } });
      if (existing) {
        await recordLog({ status: "duplicate", statusCode: 200 });
        return NextResponse.json({ status: "skipped_duplicate" });
      }
    }

    if (type === "inbound_text") {
      const normalized = normalizePhone(fromNumber);
      if (!normalized) {
        await recordLog({ status: "invalid_phone", statusCode: 400, errorMessage: "Invalid phone number" });
        return NextResponse.json({ error: "Invalid Phone" }, { status: 400 });
      }

      const contact = await prisma.contact.findUnique({
        where: { phoneE164: normalized },
        include: { leads: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      if (contact) {
        let status: LeadStatus = LeadStatus.RESP_WARM;
        const lower = (message || "").toLowerCase();
        if (["stop", "cancel", "unsubscribe"].some((w) => lower.includes(w))) status = LeadStatus.RESP_STOP;
        if (["price", "offer", "selling", "how much"].some((w) => lower.includes(w))) status = LeadStatus.RESP_HOT;

        if (contact.leads && contact.leads[0]) {
          await prisma.lead.update({ where: { id: contact.leads[0].id }, data: { status } });
        }

        await prisma.interaction.create({
          data: {
            contactId: contact.id,
            channel: "EZTEXTING",
            direction: "INBOUND",
            body: message,
            externalId: id || `sim_${Date.now()}`,
          },
        });
      }
    }

    await recordLog({ status: "success", statusCode: 200 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    await recordLog({
      status: "error",
      statusCode: 500,
      errorMessage: (error as Error)?.message?.slice(0, 500),
    });
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
