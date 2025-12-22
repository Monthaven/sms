import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const payload = Object.fromEntries(
      Array.from(form.entries()).map(([k, v]) => [k, typeof v === "string" ? v : `${v}`])
    );

    await prisma.webhookLog.create({
      data: {
        provider: "TWILIO",
        direction: "INBOUND",
        status: payload.CallStatus ?? "UNKNOWN",
        statusCode: 200,
        payload,
      },
    });

    return new NextResponse(
      ['<?xml version="1.0" encoding="UTF-8"?>', "<Response></Response>"].join(""),
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (err) {
    console.error("Twilio voice status webhook error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
