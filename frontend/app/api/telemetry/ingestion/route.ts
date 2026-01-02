/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { PrismaClient } from "@prisma/client";
import { logger, generateRequestId } from "@/lib/logger";

// Extended Prisma type for optional models that may not exist in all environments
type ExtendedPrismaClient = PrismaClient & {
  ingestionJob?: {
    findMany: (args: {
      orderBy?: Record<string, string>;
      take?: number;
      include?: Record<string, unknown>;
    }) => Promise<unknown[]>;
  };
};

const db = prisma as ExtendedPrismaClient;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Auth check for internal dashboard route
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const delegate = db?.ingestionJob;
    if (!delegate) {
      return NextResponse.json([]);
    }
    const jobs = await delegate.findMany({
      orderBy: { startedAt: "desc" },
      take: 25,
    include: {
      campaign: { select: { name: true } },
      startedBy: { select: { name: true, email: true } },
    }
    });
    return NextResponse.json(jobs);
  } catch (error) {
    const requestId = generateRequestId();
    logger.error("Telemetry ingestion fetch error", { requestId }, error as Error);
    return NextResponse.json({ error: "Failed to fetch ingestion jobs", requestId }, { status: 500 });
  }
}
