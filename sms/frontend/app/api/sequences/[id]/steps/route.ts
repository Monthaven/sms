import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const steps = await prisma.sequenceStep.findMany({
    where: { sequenceId: params.id },
    orderBy: { stepNumber: "asc" },
  });
  return NextResponse.json(steps);
}

export async function POST(req: Request, { params }: Params) {
  const body = await req.json();
  const stepNumber = body?.stepNumber ?? 1;
  const name = body?.name || `Step ${stepNumber}`;
  const template = body?.template || "";
  const delayDays = body?.delayDays ?? 0;
  const step = await prisma.sequenceStep.create({
    data: {
      sequenceId: params.id,
      stepNumber,
      name,
      template,
      delayDays,
      skipIfResponded: body?.skipIfResponded ?? true,
      skipIfOptedOut: body?.skipIfOptedOut ?? true,
    },
  });
  return NextResponse.json(step);
}
