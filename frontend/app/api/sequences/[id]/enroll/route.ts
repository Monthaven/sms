/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const sequences = await prisma.sequence.findMany({
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      _count: { select: { SequenceContact: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sequences);
}

export async function POST(req: NextRequest, context: any) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const { id } = context.params;
  const body = await req.json().catch(() => ({}));
  const contactIds: string[] = Array.isArray(body.contactIds) ? body.contactIds : [];

  if (!contactIds.length) {
    return NextResponse.json(
      { error: { message: "contactIds array is required" } },
      { status: 400 }
    );
  }

  const sequence = await prisma.sequence.findUnique({ where: { id } });
  if (!sequence) {
    return NextResponse.json(
      { error: { message: "Sequence not found" } },
      { status: 404 }
    );
  }

  let enrolled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const contactId of contactIds) {
    try {
      await prisma.sequenceContact.upsert({
        where: {
          sequence_id_contact_id: {
            sequence_id: id,
            contact_id: contactId,
          },
        },
        update: {
          status: "active",
        },
        create: {
          sequence_id: id,
          contact_id: contactId,
          status: "active",
          current_step: 0,
        },
      });
      enrolled += 1;
    } catch (err: any) {
      skipped += 1;
      errors.push(`contact ${contactId}: ${err?.message || "failed"}`);
    }
  }

  return NextResponse.json({ enrolled, skipped, errors });
}
