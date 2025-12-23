/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { initiateCallSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }

  const body = await req.json();
  const parsed = initiateCallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const { leadId } = parsed.data;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { contact: true },
  });

  if (!lead || !lead.contact?.phoneE164) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Lead or phone not found" } }, { status: 404 });
  }

  if (lead.contact.doNotContact) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Contact is marked do-not-contact" } }, { status: 403 });
  }

  const call = await prisma.call.create({
    data: {
      leadId,
      contactId: lead.contactId,
      userId: user.id,
      direction: "OUTBOUND",
      status: "INITIATED",
      startedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      callId: call.id,
      to: lead.contact.phoneE164,
      contactName: lead.contact.firstName ?? lead.contact.full_name ?? "Unknown",
    },
  });
}
