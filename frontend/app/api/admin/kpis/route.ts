/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// KPI aggregation endpoint for admin dashboard
export async function GET(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !["ADMIN", "MANAGER"].includes(currentUser.role)) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const url = new URL(req.url);
  const daysBack = parseInt(url.searchParams.get("days") || "30", 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  // Get aggregate metrics
  const [
    totalLeads,
    leadsThisPeriod,
    callsThisPeriod,
    messagesThisPeriod,
    leadsByStatus,
    agents,
    dailyActivity,
  ] = await Promise.all([
    // Total leads in system
    prisma.lead.count(),

    // Leads created in period
    prisma.lead.count({
      where: { createdAt: { gte: startDate } },
    }),

    // Calls in period
    prisma.call.count({
      where: { startedAt: { gte: startDate } },
    }),

    // Messages in period
    prisma.message.count({
      where: { createdAt: { gte: startDate } },
    }),

    // Leads grouped by status
    prisma.lead.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Get all agents
    prisma.user.findMany({
      where: { role: { in: ["AGENT", "CALLER"] } },
      select: {
        id: true,
        name: true,
        role: true,
      },
    }),

    // Daily activity for chart
    prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::integer as count
      FROM "Lead"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
  ]);

  // Convert BigInt to Number for JSON serialization
  const safeDaily = (dailyActivity as any[]).map((d: any) => ({
    date: d.date,
    count: Number(d.count),
  }));

  // Get agent performance counts separately
  const agentLeaderboard = await Promise.all(
    agents.map(async (agent) => {
      const [leadsCount, callsCount] = await Promise.all([
        prisma.lead.count({
          where: {
            assignedToId: agent.id,
            createdAt: { gte: startDate },
          },
        }),
        prisma.call.count({
          where: {
            userId: agent.id,
            startedAt: { gte: startDate },
          },
        }),
      ]);
      return {
        id: agent.id,
        name: agent.name || "Unknown",
        role: agent.role,
        leadsAssigned: leadsCount,
        callsMade: callsCount,
      };
    })
  );

  // Sort by calls made
  agentLeaderboard.sort((a, b) => b.callsMade - a.callsMade);

  // Transform status breakdown
  const statusBreakdown = leadsByStatus.reduce(
    (acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate conversion rate (leads that progressed past NEW)
  const convertedLeads = Object.entries(statusBreakdown)
    .filter(([status]) => !["NEW", "INVALID"].includes(status))
    .reduce((sum, [, count]) => sum + count, 0);
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  return NextResponse.json({
    summary: {
      totalLeads,
      leadsThisPeriod,
      callsThisPeriod,
      messagesThisPeriod,
      conversionRate: conversionRate.toFixed(1),
    },
    statusBreakdown,
    agentLeaderboard,
    dailyActivity: safeDaily,
    periodDays: daysBack,
  });
}
