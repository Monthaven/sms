/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { logger, generateRequestId } from "@/lib/logger";

// Validation schema for enrollment
const enrollRequestSchema = z.object({
  contactIds: z.array(z.string().min(1)).min(1, "At least one contact ID is required"),
});

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  try {
    const sequences = await prisma.sequence.findMany({
      include: {
        steps: { orderBy: { stepNumber: "asc" } },
        _count: { select: { SequenceContact: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sequences);
  } catch (error) {
    const requestId = generateRequestId();
    logger.error("Failed to fetch sequences", { requestId }, error as Error);
    return NextResponse.json(
      { error: { message: "Failed to fetch sequences", requestId } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: any) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const { id } = context.params;

  try {
    const body = await req.json().catch(() => ({}));
    
    // Validate request body
    const validation = enrollRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: validation.error.issues[0]?.message || "Invalid request" } },
        { status: 400 }
      );
    }

    const { contactIds } = validation.data;

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

    logger.info("Sequence enrollment completed", { sequenceId: id, enrolled, skipped });
    return NextResponse.json({ enrolled, skipped, errors });
  } catch (error) {
    const requestId = generateRequestId();
    logger.error("Failed to enroll contacts", { requestId, sequenceId: id }, error as Error);
    return NextResponse.json(
      { error: { message: "Failed to enroll contacts", requestId } },
      { status: 500 }
    );
  }
}
