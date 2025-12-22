/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier")?.toUpperCase() || "ALL";
  const where: any = {};
  if (tier === "HIGH") where.dm_tier = "HIGH";
  if (tier === "MEDIUM") where.dm_tier = { in: ["HIGH", "MEDIUM"] };

  const contacts = await prisma.contact.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneE164: true,
      dm_tier: true,
    },
    take: 200,
  });

  return NextResponse.json(contacts);
}
