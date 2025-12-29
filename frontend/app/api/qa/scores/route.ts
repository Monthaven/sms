/**
 * PROPRIETARY — Always Improving LLC
 * QA Scoring API - Call quality assessment
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scoreSchema = z.object({
  callId: z.string(),
  score: z.number().min(0).max(100),
  criteria: z.record(z.string(), z.number().min(0).max(100)).optional(),
  notes: z.string().optional(),
});

/**
 * GET - List QA scores with filters
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const whereCondition: any = {};

  if (agentId) {
    whereCondition.call = {
      userId: agentId,
    };
  }

  if (startDate || endDate) {
    whereCondition.scoredAt = {};
    if (startDate) whereCondition.scoredAt.gte = new Date(startDate);
    if (endDate) whereCondition.scoredAt.lte = new Date(endDate);
  }

  const scores = await prisma.qualityScore.findMany({
    where: whereCondition,
    include: {
      call: {
        select: {
          id: true,
          duration: true,
          direction: true,
          recordingUrl: true,
          startedAt: true,
          user: {
            select: { id: true, name: true },
          },
          contact: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      scorer: {
        select: { name: true },
      },
    },
    orderBy: { scoredAt: "desc" },
    take: limit,
  });

  // Calculate averages
  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s.overall, 0) / scores.length
    : 0;

  return NextResponse.json({
    scores,
    stats: {
      count: scores.length,
      avgScore: Math.round(avgScore * 10) / 10,
    },
  });
}

/**
 * POST - Create QA score for a call
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/qa/scores", requestId });

  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = scoreSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { callId, score, criteria, notes } = parsed.data;

    // Verify call exists
    const call = await prisma.call.findUnique({
      where: { id: callId },
      select: { id: true, userId: true },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Check if already scored
    const existing = await prisma.qualityScore.findUnique({
      where: { callId },
    });

    if (existing) {
      return NextResponse.json({ 
        error: "Call already has a QA score",
        existingScore: existing,
      }, { status: 409 });
    }

    const qualityScore = await prisma.qualityScore.create({
      data: {
        callId,
        scoredBy: user.id,
        overall: score,
        greeting: criteria?.greeting || 0,
        discovery: criteria?.discovery || 0,
        objections: criteria?.objections || 0,
        closing: criteria?.closing || 0,
        compliance: criteria?.compliance || 0,
        notes: notes || null,
      },
      include: {
        call: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
    });

    log.info("QA score created", { 
      callId, 
      score, 
      scoredBy: user.id,
      agentId: call.userId,
    });

    // Create notification for the agent
    await prisma.notification.create({
      data: {
        userId: call.userId,
        type: "MANAGER_ALERT",
        title: "Call Quality Score",
        body: `Your call received a QA score of ${score}/100`,
        priority: score < 60 ? "HIGH" : "NORMAL",
        relatedType: "call",
        relatedId: callId,
      },
    });

    return NextResponse.json({ qualityScore }, { status: 201 });

  } catch (error: any) {
    log.error("Failed to create QA score", { error: error.message });
    return NextResponse.json({ error: "Score creation failed" }, { status: 500 });
  }
}
