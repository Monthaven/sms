/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const { leadId } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      Contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneE164: true,
          email: true,
          score: true,
          priority: true,
          intent: true,
        },
      },
      Property: {
        select: {
          id: true,
          address: true,
          addressLine1: true,
          city: true,
          state: true,
          zip: true,
          postalCode: true,
          units: true,
        },
      },
      Call: {
        orderBy: { startedAt: "desc" },
        take: 20,
        select: {
          id: true,
          duration: true,
          disposition: true,
          notes: true,
          startedAt: true,
          User: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: { message: "Lead not found" } }, { status: 404 });
  }

  // Get messages via contact (since Message connects to Contact, not Lead)
  const messages = lead.Contact ? await prisma.message.findMany({
    where: { contactId: lead.Contact.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      direction: true,
      body: true,
      createdAt: true,
      status: true,
    },
  }) : [];

  return NextResponse.json({
    id: lead.id,
    status: lead.status,
    callbackAt: lead.callbackAt?.toISOString() || null,
    createdAt: lead.createdAt.toISOString(),
    contact: lead.Contact ? {
      id: lead.Contact.id,
      name: `${lead.Contact.firstName || ''} ${lead.Contact.lastName || ''}`.trim() || "Unknown",
      phone: lead.Contact.phoneE164,
      email: lead.Contact.email,
      score: lead.Contact.score,
      priority: lead.Contact.priority,
      intent: lead.Contact.intent,
    } : null,
    property: lead.Property ? {
      id: lead.Property.id,
      address: lead.Property.address || lead.Property.addressLine1,
      city: lead.Property.city,
      state: lead.Property.state,
      zip: lead.Property.zip || lead.Property.postalCode,
      units: lead.Property.units,
    } : null,
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      status: m.status,
    })),
    calls: lead.Call.map((c) => ({
      id: c.id,
      duration: c.duration || 0,
      outcome: c.disposition,
      notes: c.notes,
      createdAt: c.startedAt.toISOString(),
      user: c.User,
    })),
  });
}
