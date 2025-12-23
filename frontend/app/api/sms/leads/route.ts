/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/sms/leads
 * Get leads for SMS/calling, with optional status filter
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const where: any = {
    contact: {
      doNotContact: false,
    },
  };

  // Filter by status
  if (status) {
    const statuses = status.split(",").map((s) => s.trim().toUpperCase());
    where.status = { in: statuses };
  }

  // Non-admins only see their assigned leads or unassigned
  if (!["ADMIN", "MANAGER"].includes(user.role)) {
    where.OR = [
      { assignedToId: null },
      { assignedToId: user.id },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [
        { callbackAt: "asc" },
        { contact: { score: "desc" } },
      ],
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneE164: true,
            score: true,
            priority: true,
            intent: true,
          },
        },
        property: {
          select: {
            id: true,
            address: true,
            addressLine1: true,
            city: true,
            state: true,
          },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    leads: leads.map((lead) => ({
      id: lead.id,
      status: lead.status,
      callbackAt: lead.callbackAt?.toISOString() || null,
      contact: lead.contact ? {
        id: lead.contact.id,
        name: `${lead.contact.firstName || ""} ${lead.contact.lastName || ""}`.trim() || "Unknown",
        phone: lead.contact.phoneE164,
        score: lead.contact.score,
        priority: lead.contact.priority,
        intent: lead.contact.intent,
      } : null,
      property: lead.property ? {
        id: lead.property.id,
        address: lead.property.address || lead.property.addressLine1,
        city: lead.property.city,
        state: lead.property.state,
      } : null,
    })),
    meta: { total, limit, offset },
  });
}
