/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

type AgentPresence = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  leadsAssigned: number;
  status: "online" | "away" | "offline";
};

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/agents", requestId });
  
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
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { 
        status: 429,
        headers: rateLimitHeaders(rateLimit)
      }
    );
  }

  try {
    const agents = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
        Lead: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    });

    const now = Date.now();
    const payload: AgentPresence[] = agents.map((agent) => {
      const updatedDiff = now - agent.updatedAt.getTime();
      let status: AgentPresence["status"] = "offline";
      if (updatedDiff < 5 * 60 * 1000) {
        status = "online";
      } else if (updatedDiff < 20 * 60 * 1000) {
        status = "away";
      }

      return {
        id: agent.id,
        name: agent.name ?? agent.email,
        email: agent.email,
        role: agent.role,
        leadsAssigned: agent.Lead.length,
        status,
      };
    });

    log.debug("Agents fetched", { count: payload.length });

    return NextResponse.json(payload, {
      headers: rateLimitHeaders(rateLimit)
    });
  } catch (error: any) {
    log.error("Failed to fetch agents", {}, error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}
