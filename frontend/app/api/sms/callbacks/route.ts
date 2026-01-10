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
  const view = url.searchParams.get("view") || "today";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  let whereClause: any = {
    callbackAt: { not: null },
    status: { notIn: ["ARCHIVED", "CONVERTED", "RESP_STOP"] },
  };

  // Filter by assigned user for non-admin
  if (!["ADMIN", "MANAGER"].includes(currentUser.role)) {
    whereClause.assignedTo = currentUser.id;
  }

  // Apply view-specific filters
  switch (view) {
    case "today":
      whereClause.callbackAt = {
        gte: startOfToday,
        lt: endOfToday,
      };
      break;
    case "upcoming":
      whereClause.callbackAt = {
        gte: endOfToday,
      };
      break;
    case "overdue":
      whereClause.callbackAt = {
        lt: startOfToday,
      };
      break;
  }

  const leads = await prisma.lead.findMany({
    where: whereClause,
    select: {
      id: true,
      callbackAt: true,
      status: true,
      Contact: {
        select: {
          firstName: true,
          lastName: true,
          phoneE164: true,
        },
      },
      Property: {
        select: {
          address: true,
          city: true,
          state: true,
        },
      },
    },
    orderBy: {
      callbackAt: view === "overdue" ? "desc" : "asc",
    },
    take: 50,
  });

  const callbacks = leads.map((lead) => ({
    id: lead.id,
    callbackAt: lead.callbackAt?.toISOString(),
    lead: {
      id: lead.id,
      status: lead.status,
      contact: lead.Contact ? {
        name: `${lead.Contact.firstName || ''} ${lead.Contact.lastName || ''}`.trim() || "Unknown",
        phone: lead.Contact.phoneE164,
      } : null,
      property: lead.Property,
    },
  }));

  return NextResponse.json({ callbacks });
}
