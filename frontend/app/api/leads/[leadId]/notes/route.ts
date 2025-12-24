/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const body = await request.json();
    const { notes } = body;

    if (typeof notes !== "string") {
      return NextResponse.json(
        { error: "Notes must be a string" },
        { status: 400 }
      );
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { notes },
    });

    return NextResponse.json({ success: true, notes: updated.notes });
  } catch (error) {
    console.error("Failed to update lead notes:", error);
    return NextResponse.json(
      { error: "Failed to update notes" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { notes: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ notes: lead.notes });
  } catch (error) {
    console.error("Failed to get lead notes:", error);
    return NextResponse.json(
      { error: "Failed to get notes" },
      { status: 500 }
    );
  }
}
