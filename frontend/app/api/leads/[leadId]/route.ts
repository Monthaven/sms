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
      contact: {
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
      property: {
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
      calls: {
        orderBy: { startedAt: "desc" },
        take: 20,
        select: {
          id: true,
          duration: true,
          disposition: true,
          notes: true,
          startedAt: true,
          user: {
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
  const messages = lead.contact ? await prisma.message.findMany({
    where: { contactId: lead.contact.id },
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
    contact: lead.contact ? {
      id: lead.contact.id,
      name: `${lead.contact.firstName || ''} ${lead.contact.lastName || ''}`.trim() || "Unknown",
      phone: lead.contact.phoneE164,
      email: lead.contact.email,
      score: lead.contact.score,
      priority: lead.contact.priority,
      intent: lead.contact.intent,
    } : null,
    property: lead.property ? {
      id: lead.property.id,
      address: lead.property.address || lead.property.addressLine1,
      city: lead.property.city,
      state: lead.property.state,
      zip: lead.property.zip || lead.property.postalCode,
      units: lead.property.units,
    } : null,
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      status: m.status,
    })),
    calls: lead.calls.map((c) => ({
      id: c.id,
      duration: c.duration || 0,
      outcome: c.disposition,
      notes: c.notes,
      createdAt: c.startedAt.toISOString(),
      user: c.user,
    })),
  });
}
