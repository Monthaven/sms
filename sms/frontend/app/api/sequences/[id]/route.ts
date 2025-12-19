import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const sequence = await prisma.sequence.findUnique({
    where: { id: params.id },
    include: {
      SequenceStep: { orderBy: { stepNumber: "asc" } },
      SequenceContact: true,
    },
  });
  if (!sequence) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sequence);
}

export async function PUT(req: Request, { params }: Params) {
  const updates = await req.json();
  const sequence = await prisma.sequence.update({
    where: { id: params.id },
    data: {
      name: updates.name ?? undefined,
      status: updates.status ?? undefined,
      description: updates.description ?? undefined,
      startDate: updates.startDate ? new Date(updates.startDate) : undefined,
      endDate: updates.endDate ? new Date(updates.endDate) : undefined,
    },
  });
  return NextResponse.json(sequence);
}

export async function DELETE(_req: Request, { params }: Params) {
  await prisma.sequence.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
