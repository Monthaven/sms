import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: { id: string; stepId: string } };

export async function PUT(req: Request, { params }: Params) {
  const updates = await req.json();
  const step = await prisma.sequenceStep.update({
    where: { id: params.stepId },
    data: {
      name: updates.name ?? undefined,
      template: updates.template ?? undefined,
      delayDays: updates.delayDays ?? undefined,
      stepNumber: updates.stepNumber ?? undefined,
      skipIfResponded: updates.skipIfResponded ?? undefined,
      skipIfOptedOut: updates.skipIfOptedOut ?? undefined,
    },
  });
  return NextResponse.json(step);
}

export async function DELETE(_req: Request, { params }: Params) {
  await prisma.sequenceStep.delete({ where: { id: params.stepId } });
  return NextResponse.json({ success: true });
}
