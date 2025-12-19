import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const body = await req.json();
  const tier = (body?.tier as string | undefined)?.toUpperCase() || "ALL";

  const where: any = { doNotContact: false };
  if (tier === "HIGH") where.dm_tier = "HIGH";
  if (tier === "MEDIUM") where.dm_tier = { in: ["HIGH", "MEDIUM"] };

  const contacts = await prisma.contact.findMany({
    where,
    select: { id: true },
  });

  let enrolled = 0;
  for (const contact of contacts) {
    try {
      await prisma.sequenceContact.create({
        data: {
          sequence_id: params.id,
          contact_id: contact.id,
          status: "pending",
          current_step: 0,
        },
      });
      enrolled++;
    } catch (e: any) {
      if (e.code !== "P2002") throw e;
    }
  }

  if (enrolled > 0) {
    await prisma.sequence.update({
      where: { id: params.id },
      data: { totalContacts: { increment: enrolled } },
    });
  }

  return NextResponse.json({ enrolled, totalCandidates: contacts.length });
}
