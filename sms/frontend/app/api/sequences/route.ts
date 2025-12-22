/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const sequences = await prisma.sequence.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      SequenceStep: true,
      SequenceContact: true,
    },
  });
  const formatted = sequences.map((seq) => ({
    id: seq.id,
    name: seq.name,
    status: seq.status || "draft",
    stepsCount: seq.SequenceStep.length,
    totalContacts: seq.totalContacts ?? seq.SequenceContact.length,
    messagesSent: seq.messagesSent ?? 0,
  }));
  return NextResponse.json(formatted);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = body?.name;
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const sequence = await prisma.sequence.create({
    data: { name, status: "draft" },
  });
  return NextResponse.json(sequence);
}
