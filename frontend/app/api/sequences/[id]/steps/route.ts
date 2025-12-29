/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Sequence Steps API - Manage steps within a sequence
 * GET  - Get all steps for a sequence
 * POST - Add a step to a sequence
 * PUT  - Bulk update steps (for reordering)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ============================================================================
// GET - Get all steps for a sequence
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  try {
    const steps = await prisma.sequenceStep.findMany({
      where: { sequenceId: id },
      orderBy: { stepNumber: "asc" },
    });

    return NextResponse.json(steps);
  } catch (error: any) {
    console.error("Failed to fetch steps:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch steps" } },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Add a step to a sequence
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, template, delayDays, skipIfResponded, skipIfOptedOut, stepNumber } = body;

    if (!name || !template) {
      return NextResponse.json(
        { error: { message: "Name and template are required" } },
        { status: 400 }
      );
    }

    // Get the next step number if not provided
    let nextStepNumber = stepNumber;
    if (nextStepNumber === undefined) {
      const lastStep = await prisma.sequenceStep.findFirst({
        where: { sequenceId: id },
        orderBy: { stepNumber: "desc" },
      });
      nextStepNumber = (lastStep?.stepNumber || 0) + 1;
    }

    const step = await prisma.sequenceStep.create({
      data: {
        sequenceId: id,
        name,
        template,
        stepNumber: nextStepNumber,
        delayDays: delayDays ?? 0,
        skipIfResponded: skipIfResponded ?? true,
        skipIfOptedOut: skipIfOptedOut ?? true,
      },
    });

    return NextResponse.json(step, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create step:", error);
    return NextResponse.json(
      { error: { message: "Failed to create step" } },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Bulk update steps (for reordering)
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { steps } = body;

    if (!Array.isArray(steps)) {
      return NextResponse.json(
        { error: { message: "Steps array is required" } },
        { status: 400 }
      );
    }

    // Update each step's order
    const updates = await Promise.all(
      steps.map((step: { id: string; stepNumber: number }) =>
        prisma.sequenceStep.update({
          where: { id: step.id },
          data: { stepNumber: step.stepNumber },
        })
      )
    );

    return NextResponse.json({ updated: updates.length });
  } catch (error: any) {
    console.error("Failed to update steps:", error);
    return NextResponse.json(
      { error: { message: "Failed to update steps" } },
      { status: 500 }
    );
  }
}
