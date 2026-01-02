/**
 * PROPRIETARY — Always Improving LLC  
 * Live Call Dashboard API - Real-time agent status
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET - Live dashboard data for managers
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  try {
    const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Get all agents with their current status
  const agents = await prisma.user.findMany({
    where: {
      role: { in: ["CALLER", "AGENT"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isOnline: true,
      status: true,
      statusSince: true,
      currentCallId: true,
      breakReason: true,
      lastActiveAt: true,
      shiftStart: true,
      shiftEnd: true,
      _count: {
        select: {
          calls: {
            where: {
              startedAt: { gte: todayStart },
            },
          },
          scheduledMessages: {
            where: {
              createdAt: { gte: todayStart },
            },
          },
        },
      },
    },
    orderBy: [
      { isOnline: "desc" },
      { name: "asc" },
    ],
  });

  // Get active calls
  const activeCalls = await prisma.call.findMany({
    where: {
      status: { in: ["in-progress", "ringing", "on_hold"] },
    },
    select: {
      id: true,
      status: true,
      direction: true,
      duration: true,
      startedAt: true,
      holdStartedAt: true,
      monitoredBy: true,
      user: {
        select: { id: true, name: true },
      },
      contact: {
        select: { 
          id: true, 
          firstName: true, 
          lastName: true,
          phoneE164: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  // Calculate queue stats
  const queueStats = {
    incomingQueue: activeCalls.filter(c => c.direction === "inbound" && c.status === "ringing").length,
    activeCallCount: activeCalls.filter(c => c.status === "in-progress").length,
    onHoldCount: activeCalls.filter(c => c.status === "on_hold").length,
    monitoredCount: activeCalls.filter(c => c.monitoredBy).length,
  };

  // Today's stats
  const todayStats = await prisma.$transaction([
    prisma.call.count({
      where: {
        startedAt: { gte: todayStart },
        direction: "outbound",
      },
    }),
    prisma.call.count({
      where: {
        startedAt: { gte: todayStart },
        direction: "inbound",
      },
    }),
    prisma.message.count({
      where: {
        createdAt: { gte: todayStart },
        direction: "outbound",
      },
    }),
    prisma.call.aggregate({
      where: {
        startedAt: { gte: todayStart },
        duration: { gt: 0 },
      },
      _avg: { duration: true },
      _sum: { duration: true },
    }),
  ]);

  // Agent status breakdown
  const statusBreakdown = {
    online: agents.filter(a => a.status === "ONLINE").length,
    onCall: agents.filter(a => a.status === "ON_CALL").length,
    onBreak: agents.filter(a => a.status === "ON_BREAK").length,
    wrapping: agents.filter(a => a.status === "WRAPPING").length,
    offline: agents.filter(a => a.status === "OFFLINE" || !a.isOnline).length,
  };

  return NextResponse.json({
    agents: agents.map(a => ({
      ...a,
      callsToday: a._count.calls,
      messagesToday: a._count.scheduledMessages,
      _count: undefined,
    })),
    activeCalls: activeCalls.map(c => ({
      ...c,
      durationSeconds: c.startedAt 
        ? Math.floor((now.getTime() - new Date(c.startedAt).getTime()) / 1000)
        : 0,
    })),
    queueStats,
    todayStats: {
      outboundCalls: todayStats[0],
      inboundCalls: todayStats[1],
      outboundMessages: todayStats[2],
      avgCallDuration: Math.round(todayStats[3]._avg.duration || 0),
      totalTalkTime: todayStats[3]._sum.duration || 0,
    },
    statusBreakdown,
    timestamp: now.toISOString(),
  });
  } catch (error) {
    const requestId = generateRequestId();
    logger.error("Dashboard live fetch error", { requestId }, error as Error);
    return NextResponse.json({ error: "Failed to fetch live data", requestId }, { status: 500 });
  }
}
