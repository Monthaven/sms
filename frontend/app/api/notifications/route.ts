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
  const log = logger.child({ endpoint: "/api/notifications", requestId });

  // Auth check
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit(clientIP, RATE_LIMITS.API_GENERAL);
  
  if (!rateLimit.success) {
    log.warn("Rate limit exceeded", { clientIP });
    return NextResponse.json([], { status: 429 });
  }

  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const hotLeads = await prisma.lead.findMany({
      where: {
        status: "RESP_HOT",
        updatedAt: { gte: twoHoursAgo },
      },
      include: {
        Contact: {
          select: { id: true, firstName: true, lastName: true, phoneE164: true, score: true },
        },
        Property: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentResponses = await prisma.interaction.findMany({
      where: {
        direction: "INBOUND",
        createdAt: { gte: oneHourAgo },
      },
      include: {
        Contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneE164: true,
            Lead: {
              take: 1,
              orderBy: { updatedAt: "desc" },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const notifications = [
      ...hotLeads.map((lead) => ({
        id: `hot-${lead.id}`,
        type: "hot_lead" as const,
        title: `🔥 Hot lead: ${lead.Contact?.firstName || ""} ${lead.Contact?.lastName || ""}`.trim(),
        body: `${lead.Property?.addressLine1 || "Property"} - Score: ${lead.Contact?.score || "N/A"}`,
        href: `/dashboard/chat/${lead.id}`,
        time: lead.updatedAt,
      })),
      ...recentResponses.map((interaction) => ({
        id: `response-${interaction.id}`,
        type: "new_response" as const,
        title: `New Response: ${interaction.Contact?.firstName || ""} ${interaction.Contact?.lastName || ""}`.trim(),
        body:
          interaction.body?.substring(0, 80) +
            (interaction.body && interaction.body.length > 80 ? "..." : "") ||
          "New message received",
        href: `/dashboard/chat/${interaction.Contact?.Lead?.[0]?.id || interaction.contactId}`,
        time: interaction.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);

    log.debug("Notifications fetched", { count: notifications.length });

    return NextResponse.json(notifications, {
      headers: rateLimitHeaders(rateLimit)
    });
  } catch (error: any) {
    log.error("Error fetching notifications", {}, error);
    return NextResponse.json([]);
  }
}
