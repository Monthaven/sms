/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLeadQueue } from "@/lib/lead-queue";
import { maskContact, shouldMaskForRole } from "@/lib/masking";
import { queueFiltersSchema } from "@/lib/validations";
import { LeadStatus, UserRole } from "@prisma/client";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }
  // Only allow callers/agents/admins
  const allowedRoles: UserRole[] = ["CALLER", "AGENT", "ADMIN", "MANAGER"];
  if (!allowedRoles.includes(user.role as UserRole)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }

  const url = new URL(req.url);
  const parsed = queueFiltersSchema.safeParse({
    priority: url.searchParams.get("priority") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid query", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const { priority, sort, limit, offset } = parsed.data;
  const { leads, total } = await getLeadQueue(user.id, { priority, sort, limit, offset });

  const shouldMask = shouldMaskForRole(user.role);
  const responseLeads = leads.map((lead) => ({
    lead: {
      id: lead.id,
      status: lead.status,
      callbackAt: lead.callbackAt,
      assignedTo: lead.assignedToId,
    },
    contact: maskContact(
      {
        name: lead.Contact?.firstName ?? lead.Contact?.full_name ?? "",
        phone: lead.Contact?.phoneE164 ?? null,
        email: lead.Contact?.email ?? null,
        score: lead.Contact?.score ?? 0,
        priority: lead.Contact?.priority ?? "LOW",
        intent: lead.Contact?.intent ?? null,
      },
      shouldMask
    ),
    property: lead.Property
      ? {
        address: lead.Property.addressLine1 ?? lead.Property.address ?? "",
        city: lead.Property.city ?? "",
        state: lead.Property.state ?? "",
        units: lead.Property.units ?? 0,
        value: lead.Property.rawDetails ? Number((lead.Property.rawDetails as any).value || 0) : 0,
      }
      : null,
  }));

  return NextResponse.json({
    success: true,
    data: { leads: responseLeads },
    meta: { total, page: Math.floor(offset / limit) + 1, pageSize: limit },
  });
}
