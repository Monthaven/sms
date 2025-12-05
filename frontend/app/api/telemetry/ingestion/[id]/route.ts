import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
const db = prisma as any;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const delegate = db?.ingestionJob;
  if (!delegate) {
    return NextResponse.json({ error: "Ingestion delegate unavailable" }, { status: 500 });
  }
  const job = await delegate.findUnique({
    where: { id: params.id },
    include: {
      startedBy: { select: { name: true, email: true } },
      campaign: { select: { name: true } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("download")) {
    return new NextResponse(JSON.stringify(job, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ingestion-${job.id}.json"`,
      },
    });
  }

  return NextResponse.json(job);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const job = await delegate.findUnique({
    where: { id: params.id },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const updated = await delegate.update({
    where: { id: params.id },
    data: {
      status: "PENDING",
      rowsProcessed: 0,
      contactsCreated: 0,
      leadsCreated: 0,
      startedAt: new Date(),
      finishedAt: null,
      durationSeconds: null,
      errorMessage: null,
    },
  });

  return NextResponse.json(updated);
}
