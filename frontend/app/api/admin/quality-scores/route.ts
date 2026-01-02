/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { logger, generateRequestId } from "@/lib/logger";

const createScoreSchema = z.object({
  callId: z.string(),
  greeting: z.number().min(0).max(10),
  discovery: z.number().min(0).max(10),
  objections: z.number().min(0).max(10),
  closing: z.number().min(0).max(10),
  compliance: z.number().min(0).max(10),
  notes: z.string().optional(),
  coachingPoints: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !["ADMIN", "MANAGER"].includes(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const where: Record<string, unknown> = {};

    if (userId) {
      where.call = { userId };
    }

    if (startDate || endDate) {
      where.scoredAt = {};
      if (startDate) (where.scoredAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.scoredAt as Record<string, Date>).lte = new Date(endDate);
    }

    const [scores, total] = await Promise.all([
      db.qualityScore.findMany({
        where,
        include: {
          call: {
            select: {
              id: true,
              twilioCallSid: true,
              direction: true,
              duration: true,
              startedAt: true,
              recordingUrl: true,
              user: {
                select: { id: true, name: true },
              },
              contact: {
                select: { firstName: true, lastName: true, phoneE164: true },
              },
            },
          },
          scorer: {
            select: { id: true, name: true },
          },
        },
        orderBy: { scoredAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.qualityScore.count({ where }),
    ]);

    return NextResponse.json({
      scores,
      total,
      limit,
      offset,
    });
  } catch (error) {
    const requestId = generateRequestId();
    logger.error("Quality scores error", { requestId }, error as Error);
    return NextResponse.json({ error: "Failed to fetch scores", requestId }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !["ADMIN", "MANAGER"].includes(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = createScoreSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { callId, greeting, discovery, objections, closing, compliance, notes, coachingPoints } =
      validation.data;

    // Check if call exists
    const call = await db.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Check if score already exists
    const existingScore = await db.qualityScore.findUnique({
      where: { callId },
    });

    if (existingScore) {
      return NextResponse.json({ error: "Score already exists for this call" }, { status: 400 });
    }

    // Calculate overall score
    const overall = Math.round((greeting + discovery + objections + closing + compliance) / 5);

    // Create the score
    const score = await db.qualityScore.create({
      data: {
        callId,
        scoredBy: currentUser.id,
        greeting,
        discovery,
        objections,
        closing,
        compliance,
        overall,
        notes,
        coachingPoints: coachingPoints || [],
      },
      include: {
        call: {
          select: { userId: true },
        },
      },
    });

    // Create notification for the agent
    if (score.call.userId) {
      await db.notification.create({
        data: {
          userId: score.call.userId,
          type: "SYSTEM",
          priority: "NORMAL",
          title: "Call Quality Score Received",
          body: `Your call has been scored: ${overall}/10`,
          actionUrl: `/calls/${callId}`,
          relatedType: "QualityScore",
          relatedId: score.id,
        },
      });
    }

    return NextResponse.json(score, { status: 201 });
  } catch (error) {
    const requestId = generateRequestId();
    logger.error("Create score error", { requestId }, error as Error);
    return NextResponse.json({ error: "Failed to create score", requestId }, { status: 500 });
  }
}
