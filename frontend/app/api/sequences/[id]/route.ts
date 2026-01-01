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
        steps: { orderBy: { stepNumber: "asc" } },
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

    return NextResponse.json(sequence);
  } catch (error: any) {
    console.error("Failed to fetch sequence:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch sequence" } },
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
        steps: { orderBy: { stepNumber: "asc" } },
        _count: { select: { SequenceContact: true } },
      },
    });

    return NextResponse.json(sequence);
  } catch (error: any) {
    console.error("Failed to update sequence:", error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: { message: "Sequence not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to update sequence" } },
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
    console.error("Failed to delete sequence:", error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: { message: "Sequence not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to delete sequence" } },
      { status: 500 }
    );
  }
}
