/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sequenceCreateSchema, validateRequest } from "@/lib/validation-schemas";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);
  const log = logger.child({ endpoint: "/api/sequences", clientIP });

  // Auth check
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`sequences:${clientIP}`, RATE_LIMITS.API_GENERAL);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  try {
    const sequences = await prisma.sequence.findMany({
      include: {
        steps: { orderBy: { stepNumber: "asc" } },
        _count: { select: { SequenceContact: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    log.debug("Sequences fetched", { count: sequences.length });
    return NextResponse.json(sequences, { headers: rateLimitHeaders(rateLimit) });
  } catch (error: any) {
    log.error("Failed to fetch sequences", {}, error);
    return NextResponse.json(
      { error: "Failed to fetch sequences" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);
  const log = logger.child({ endpoint: "/api/sequences", method: "POST", clientIP });

  // Auth check
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`sequences_create:${clientIP}`, RATE_LIMITS.API_GENERAL);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await req.json();
    
    const validation = validateRequest(sequenceCreateSchema, body);
    if (!validation.success) {
      log.warn("Sequence validation failed", { error: validation.error });
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const { name, description } = validation.data;
    
    const sequence = await prisma.sequence.create({
      data: { name, description },
    });

    log.info("Sequence created", { sequenceId: sequence.id });
    return NextResponse.json(sequence, { status: 201, headers: rateLimitHeaders(rateLimit) });
  } catch (error: any) {
    log.error("Failed to create sequence", {}, error);
    return NextResponse.json(
      { error: "Failed to create sequence" },
      { status: 500 }
    );
  }
}
