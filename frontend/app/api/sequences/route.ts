import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const sequences = await prisma.sequence.findMany({
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      _count: { select: { SequenceContact: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sequences);
}

export async function POST(req: NextRequest) {
  const { name, description } = await req.json();
  const sequence = await prisma.sequence.create({
    data: { name, description },
  });
  return NextResponse.json(sequence, { status: 201 });
}
