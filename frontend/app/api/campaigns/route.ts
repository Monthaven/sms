/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/campaigns", requestId });
  
  // Auth check
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  
  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.API_GENERAL);
  
  if (!rateLimit.success) {
    log.warn("Rate limit exceeded", { clientIP });
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { 
        status: 429,
        headers: rateLimitHeaders(rateLimit)
      }
    );
  }

  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { leads: true } },
        leads: {
          select: { status: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });

    const payload = campaigns.map((campaign) => {
      const lastActivity =
        campaign.leads[0]?.updatedAt ?? campaign.createdAt;

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        channel: campaign.ezTextingGroupId ? "EzTexting" : "MAE Engine",
        messages: campaign._count.leads,
        eta: campaign.status === "DRAFT" ? "Awaiting launch" : "Live",
        owner: campaign.ezTextingGroupId ? "EzTexting" : "CLI",
        lastActivity: lastActivity.toISOString(),
      };
    });

    log.debug("Campaigns fetched", { count: payload.length });

    return NextResponse.json(payload, {
      headers: rateLimitHeaders(rateLimit)
    });
  } catch (error: any) {
    log.error("Failed to fetch campaigns", {}, error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
