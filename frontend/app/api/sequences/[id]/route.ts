/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Sequence Detail API - GET, PUT, DELETE for individual sequences
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";

// ============================================================================
// GET - Get single sequence by ID
// ============================================================================

export async function GET(
  request: NextRequest,
  context: any
) {
  const { id } = context.params;
  
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  try {
    const sequence = await prisma.sequence.findUnique({
      where: { id },
      include: {
        SequenceStep: { orderBy: { stepNumber: "asc" } },
        SequenceContact: {
          include: {
            // Include contact data if available
          },
          take: 100,
        },
        _count: { select: { SequenceContact: true } },
      },
    });

    if (!sequence) {
      return NextResponse.json(
        { error: { message: "Sequence not found" } },
        { status: 404 }
      );
    }

    const { SequenceStep, ...rest } = sequence;

    return NextResponse.json({
      ...rest,
      steps: SequenceStep,
    });
  } catch (error: any) {
    const requestId = generateRequestId();
    logger.error("Failed to fetch sequence", { requestId, sequenceId: id }, error);
    return NextResponse.json(
      { error: { message: "Failed to fetch sequence", requestId } },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Update sequence
// ============================================================================

export async function PUT(
  request: NextRequest,
  context: any
) {
  const { id } = context.params;
  
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, status } = body;

    const sequence = await prisma.sequence.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
      include: {
        SequenceStep: { orderBy: { stepNumber: "asc" } },
        _count: { select: { SequenceContact: true } },
      },
    });

    const { SequenceStep, ...rest } = sequence;

    return NextResponse.json({
      ...rest,
      steps: SequenceStep,
    });
  } catch (error: any) {
    const requestId = generateRequestId();
    logger.error("Failed to update sequence", { requestId, sequenceId: id }, error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: { message: "Sequence not found", requestId } },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to update sequence", requestId } },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete sequence
// ============================================================================

export async function DELETE(
  request: NextRequest,
  context: any
) {
  const { id } = context.params;
  
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  try {
    // First delete related records
    await prisma.sequenceStep.deleteMany({
      where: { sequenceId: id },
    });

    await prisma.sequenceContact.deleteMany({
      where: { sequence_id: id },
    });

    // Then delete the sequence
    await prisma.sequence.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted: id });
  } catch (error: any) {
    const requestId = generateRequestId();
    logger.error("Failed to delete sequence", { requestId, sequenceId: id }, error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: { message: "Sequence not found", requestId } },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to delete sequence", requestId } },
      { status: 500 }
    );
  }
}
