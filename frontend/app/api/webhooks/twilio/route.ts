import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhone(input: string | null): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.startsWith("+") && digits.length > 1) return digits;
  return null;
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
        errorMessage: contact ? null : "Contact not found",
      },
    });

    if (!contact) {
      return new NextResponse("<Response/>", {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Locate the latest lead for this contact (if any)
    const lead = await prisma.lead.findFirst({
      where: { contactId: contact.id },
      orderBy: { updatedAt: "desc" },
    });

    // Insert interaction
    await prisma.interaction.create({
      data: {
        contactId: contact.id,
        channel: "TWILIO",
        direction: "INBOUND",
        body: body || "(no body)",
        externalId: sid,
      },
    });

    // Nudge lead status if present
    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "CONVERSATION_ACTIVE",
        },
      });
    }

    return new NextResponse("<Response/>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err: any) {
    console.error("Twilio webhook error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
