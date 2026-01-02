/**
 * PROPRIETARY ƒ?" Always Improving LLC
 * Copyright Ac 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement A8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";

export async function PATCH(request: NextRequest, context: any) {
  const { id, stepId } = context.params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, template, delayDays, skipIfResponded, skipIfOptedOut } = body;

    const step = await prisma.sequenceStep.update({
      where: { id: stepId },
      data: {
        ...(name !== undefined && { name }),
        ...(template !== undefined && { template }),
        ...(delayDays !== undefined && { delayDays }),
        ...(skipIfResponded !== undefined && { skipIfResponded }),
        ...(skipIfOptedOut !== undefined && { skipIfOptedOut }),
      },
    });

    return NextResponse.json(step);
  } catch (error: any) {
    const requestId = generateRequestId();
    logger.error("Failed to update step", { requestId, stepId }, error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: { message: "Step not found", requestId } }, { status: 404 });
    }
    return NextResponse.json({ error: { message: "Failed to update step", requestId } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: any) {
  const { stepId } = context.params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  try {
    await prisma.sequenceStep.delete({
      where: { id: stepId },
    });
    return NextResponse.json({ success: true, deleted: stepId });
  } catch (error: any) {
    const requestId = generateRequestId();
    logger.error("Failed to delete step", { requestId, stepId }, error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: { message: "Step not found", requestId } }, { status: 404 });
    }
    return NextResponse.json({ error: { message: "Failed to delete step", requestId } }, { status: 500 });
  }
}
