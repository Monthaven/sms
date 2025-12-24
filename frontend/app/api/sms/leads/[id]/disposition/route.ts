/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { LeadStatus, UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { dispositionSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";

const STATUS_MAP: Record<string, string> = {
  HOT_LEAD: "RESP_HOT",
  CALLBACK_REQUESTED: "QUEUED_FOR_CALL",
  NO_ANSWER: "QUEUED_FOR_CALL",
  LEFT_VOICEMAIL: "QUEUED_FOR_CALL",
  NOT_INTERESTED: "RESP_COLD",
  WRONG_NUMBER: "RESP_COLD",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }
  const allowed: UserRole[] = ["CALLER", "AGENT", "ADMIN", "MANAGER"];
  if (!allowed.includes(user.role as UserRole)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }

  const body = await req.json();
  const parsed = dispositionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const { outcome, notes, callbackAt, callId } = parsed.data as { outcome: string; notes?: string; callbackAt?: string; callId?: string };
  const { id: leadId } = await context.params;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Lead not found" } }, { status: 404 });
  }

  const newStatus = (STATUS_MAP[outcome] as LeadStatus) ?? (lead.status as LeadStatus);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: newStatus,
      callbackAt: outcome === "CALLBACK_REQUESTED" && callbackAt ? new Date(callbackAt) : lead.callbackAt,
      notes: notes,
    },
  });

  // Use specific callId if provided, otherwise find the latest call
  let targetCall;
  if (callId) {
    targetCall = await prisma.call.findUnique({
      where: { id: callId },
    });
  } else {
    targetCall = await prisma.call.findFirst({
      where: { leadId, userId: user.id },
      orderBy: { startedAt: "desc" },
    });
  }

  if (targetCall) {
    await prisma.call.update({
      where: { id: targetCall.id },
      data: {
        disposition: outcome,
        notes,
        endedAt: targetCall.endedAt ?? new Date(),
        status: targetCall.status === "COMPLETED" ? targetCall.status : "COMPLETED",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "DISPOSITION",
      entityType: "Lead",
      entityId: leadId,
      metadata: { outcome, notes, callbackAt },
    },
  });

  return NextResponse.json({ success: true });
}
