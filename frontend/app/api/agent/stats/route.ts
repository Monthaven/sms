/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "today";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let periodStart: Date;
  switch (period) {
    case "week":
      periodStart = startOfWeek;
      break;
    case "month":
      periodStart = startOfMonth;
      break;
    default:
      periodStart = startOfToday;
  }

  // Get call counts
  const [callsToday, callsThisWeek, callsThisMonth] = await Promise.all([
    prisma.call.count({
      where: { userId: currentUser.id, startedAt: { gte: startOfToday } },
    }),
    prisma.call.count({
      where: { userId: currentUser.id, startedAt: { gte: startOfWeek } },
    }),
    prisma.call.count({
      where: { userId: currentUser.id, startedAt: { gte: startOfMonth } },
    }),
  ]);

  // Get average call duration
  const callDurations = await prisma.call.aggregate({
    where: {
      userId: currentUser.id,
      startedAt: { gte: periodStart },
      duration: { gt: 0 },
    },
    _avg: { duration: true },
  });

  // Get hot leads count (disposition = HOT_LEAD)
  const hotLeads = await prisma.call.count({
    where: {
      userId: currentUser.id,
      startedAt: { gte: periodStart },
      disposition: "HOT_LEAD",
    },
  });

  // Get callbacks scheduled
  const callbacksScheduled = await prisma.lead.count({
    where: {
      assignedToId: currentUser.id,
      callbackAt: { gte: now },
    },
  });

  // Get outcome breakdown (using disposition field)
  const dispositions = await prisma.call.groupBy({
    by: ["disposition"],
    where: {
      userId: currentUser.id,
      startedAt: { gte: periodStart },
      disposition: { not: null },
    },
    _count: { id: true },
  });

  const outcomeColors: Record<string, string> = {
    HOT_LEAD: "#f97316",
    CALLBACK_REQUESTED: "#eab308",
    LEFT_VOICEMAIL: "#3b82f6",
    NO_ANSWER: "#64748b",
    NOT_INTERESTED: "#ef4444",
    WRONG_NUMBER: "#6b7280",
  };

  const outcomeBreakdown = dispositions.map((o) => ({
    name: o.disposition || "UNKNOWN",
    value: o._count.id,
    color: outcomeColors[o.disposition || ""] || "#64748b",
  }));

  // Calculate conversion rate (hot leads / total calls)
  const totalCalls = period === "today" ? callsToday : period === "week" ? callsThisWeek : callsThisMonth;
  const conversionRate = totalCalls > 0 ? (hotLeads / totalCalls) * 100 : 0;

  // Get daily activity for chart
  const dailyActivity: { day: string; calls: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(startOfToday);
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = await prisma.call.count({
      where: {
        userId: currentUser.id,
        startedAt: { gte: date, lt: nextDate },
      },
    });

    dailyActivity.push({
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      calls: count,
    });
  }

  // Get team ranking
  const allAgentCalls = await prisma.call.groupBy({
    by: ["userId"],
    where: {
      startedAt: { gte: periodStart },
      disposition: "HOT_LEAD",
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const rank = allAgentCalls.findIndex((a) => a.userId === currentUser.id) + 1 || allAgentCalls.length + 1;
  const totalAgents = await prisma.user.count({
    where: { role: { in: ["AGENT", "CALLER"] } },
  });

  // Get recent calls
  const recentCalls = await prisma.call.findMany({
    where: { userId: currentUser.id },
    orderBy: { startedAt: "desc" },
    take: 10,
    include: {
      Lead: {
        include: {
          Contact: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return NextResponse.json({
    callsToday,
    callsThisWeek,
    callsThisMonth,
    avgCallDuration: Math.round(callDurations._avg.duration || 0),
    hotLeads,
    callbacksScheduled,
    conversionRate,
    rank,
    totalAgents,
    outcomeBreakdown,
    dailyActivity,
    recentCalls: recentCalls.map((c) => ({
      id: c.id,
      contactName: c.Lead?.Contact
        ? `${c.Lead.Contact.firstName || ''} ${c.Lead.Contact.lastName || ''}`.trim() || "Unknown"
        : "Unknown",
      outcome: c.disposition || "UNKNOWN",
      duration: c.duration || 0,
      createdAt: c.startedAt.toISOString(),
    })),
  });
}
