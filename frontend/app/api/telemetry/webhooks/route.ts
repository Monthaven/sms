import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const db = prisma as any;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const delegate = db?.webhookLog;
  if (!delegate) {
    console.warn("Prisma webhookLog delegate unavailable.");
    return NextResponse.json([]);
  }
  const logs = await delegate.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(logs);
}
