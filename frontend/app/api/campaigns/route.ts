/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET() {
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

  return NextResponse.json(payload);
}
