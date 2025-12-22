/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    await prisma.webhookLog.create({
      data: {
        provider: "EMAIL_INBOUND",
        direction: "INBOUND",
        status: "RECEIVED",
        statusCode: 200,
        payload,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Email webhook error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
