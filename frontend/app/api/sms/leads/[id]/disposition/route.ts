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

export async function POST(req: Request, context: any) {
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

  const { outcome, notes, callbackAt } = parsed.data;
  const leadId = (context as { params: { id: string } }).params.id;

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

  const latestCall = await prisma.call.findFirst({
    where: { leadId, userId: user.id },
    orderBy: { startedAt: "desc" },
  });

  if (latestCall) {
    await prisma.call.update({
      where: { id: latestCall.id },
      data: {
        disposition: outcome,
        notes,
        endedAt: latestCall.endedAt ?? new Date(),
        status: latestCall.status === "COMPLETED" ? latestCall.status : "COMPLETED",
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
