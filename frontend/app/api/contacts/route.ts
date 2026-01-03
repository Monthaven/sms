/**
 * PROPRIETARY ƒ?" Always Improving LLC
 * Copyright Ac 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement A8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { logger, generateRequestId } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const clientIP = getClientIP(request);
  const rateLimit = await checkRateLimit(`contacts:${clientIP}`, RATE_LIMITS.API_GENERAL);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim();
  const tier = searchParams.get("tier");
  const take = Math.min(Number(searchParams.get("limit") || 50), 200);
  const skip = Number(searchParams.get("offset") || 0);

  const where: any = {};

  if (tier && tier !== "all") {
    where.dm_tier = tier;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { phoneE164: { contains: search } },
      {
        Property_Contact_propertyIdToProperty: {
          addressLine1: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        Property_Contact_propertyIdToProperty: {
          select: { addressLine1: true, city: true, state: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json(
    { contacts, total },
    { headers: rateLimitHeaders(rateLimit) }
  );
  } catch (error) {
    const requestId = generateRequestId();
    logger.error("Contacts fetch error", { requestId }, error as Error);
    return NextResponse.json(
      { error: { message: "Failed to fetch contacts", requestId } },
      { status: 500 }
    );
  }
}
