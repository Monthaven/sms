/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  // Auth check for notifications endpoint
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        title: `ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ Hot leads: ${lead.Contact?.firstName || ""} ${lead.Contact?.lastName || ""}`.trim(),
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

    return NextResponse.json(notifications);
  } catch (error) {
    logger.error("Error fetching notifications", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json([]);
  }
}
