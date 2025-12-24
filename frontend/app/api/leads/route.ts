/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { LeadStatus } from "@prisma/client";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);
  const log = logger.child({ endpoint: "/api/leads", clientIP });

  // Auth check
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  // Rate limiting
  const rateLimit = checkRateLimit(`leads:${clientIP}`, RATE_LIMITS.API_GENERAL);
  if (!rateLimit.success) {
    log.warn("Rate limit exceeded");
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const limitParam = searchParams.get("limit");

    let statuses: LeadStatus[] | undefined = undefined;
    if (statusParam) {
      statuses = statusParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s as LeadStatus);
    }

    const limit = Math.min(parseInt(limitParam || "500", 10), 1000);

    const leads = await prisma.lead.findMany({
      where: statuses && statuses.length > 0 ? { status: { in: statuses } } : undefined,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneE164: true,
            phoneType: true,
            email: true,
            score: true,
            interactions: {
              orderBy: { createdAt: "asc" },
              take: 50,
            },
          },
        },
        property: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    log.debug("Leads fetched", { count: leads.length, statuses });
    return NextResponse.json(leads, { headers: rateLimitHeaders(rateLimit) });
  } catch (error: any) {
    log.error("Failed to fetch leads", {}, error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

