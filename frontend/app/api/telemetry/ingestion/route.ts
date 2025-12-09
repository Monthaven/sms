import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const db = prisma as any;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const delegate = db?.ingestionJob;
  if (!delegate) {
    console.debug && console.debug("Prisma ingestionJob delegate unavailable; returning empty list.");
    return NextResponse.json([]);
  }
  const jobs = await delegate.findMany({
    orderBy: { startedAt: "desc" },
    take: 25,
    include: {
      campaign: { select: { name: true } },
      startedBy: { select: { name: true, email: true } },
    },
  });
  return NextResponse.json(jobs);
}
