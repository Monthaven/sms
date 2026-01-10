/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Lead Activity Timeline API
 * Returns unified timeline of messages, calls, notes, and status changes
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export type ActivityType = "message" | "call" | "note" | "status_change" | "assignment";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  timestamp: string;
  direction?: "INBOUND" | "OUTBOUND";
  body?: string;
  status?: string;
  disposition?: string;
  duration?: number;
  recordingUrl?: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, any>;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { leadId } = await params;

  try {
    // Fetch lead with contact
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        contactId: true,
        notes: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    // Fetch all data in parallel
    const [interactions, calls, audits] = await Promise.all([
      // Messages/Interactions
      prisma.interaction.findMany({
        where: { contactId: lead.contactId },
        orderBy: { createdAt: "desc" },
        include: {
          User: {
            select: { id: true, name: true },
          },
        },
      }),
      // Calls
      prisma.call.findMany({
        where: { leadId },
        orderBy: { startedAt: "desc" },
        include: {
          User: {
            select: { id: true, name: true },
          },
        },
      }),
      // Audit log for status changes and notes
      prisma.leadAudit.findMany({
        where: { 
          leadId,
          action: { in: ["STATUS_CHANGE", "NOTE_UPDATE", "ASSIGNMENT", "CALL_LOG", "CALL_OUTCOME"] },
        },
        orderBy: { updatedAt: "desc" },
        include: {
          User: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    // Build unified timeline
    const timeline: ActivityItem[] = [];

    // Add messages
    for (const interaction of interactions) {
      timeline.push({
        id: interaction.id,
        type: "message",
        timestamp: interaction.createdAt.toISOString(),
        direction: interaction.direction as "INBOUND" | "OUTBOUND",
        body: interaction.body,
        userId: interaction.userId ?? undefined,
        userName: interaction.User?.name ?? undefined,
      });
    }

    // Add calls
    for (const call of calls) {
      timeline.push({
        id: call.id,
        type: "call",
        timestamp: call.startedAt.toISOString(),
        direction: call.direction as "INBOUND" | "OUTBOUND",
        status: call.status,
        disposition: call.disposition ?? undefined,
        duration: call.duration ?? undefined,
        recordingUrl: call.recordingUrl ?? undefined,
        body: call.notes ?? undefined,
        userId: call.userId,
        userName: call.User?.name ?? undefined,
      });
    }

    // Add audit entries (status changes, notes, etc.)
    for (const audit of audits) {
      // Skip call logs since we already have calls above
      if (audit.action === "CALL_LOG" || audit.action === "CALL_OUTCOME") continue;
      
      let type: ActivityType = "status_change";
      if (audit.action === "NOTE_UPDATE") type = "note";
      if (audit.action === "ASSIGNMENT") type = "assignment";

      timeline.push({
        id: audit.id,
        type,
        timestamp: audit.updatedAt.toISOString(),
        body: audit.details ?? undefined,
        userId: audit.userId ?? undefined,
        userName: audit.User?.name ?? undefined,
        metadata: {
          action: audit.action,
        },
      });
    }

    // Sort by timestamp descending (most recent first)
    timeline.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        leadId,
        timeline,
        summary: {
          totalMessages: interactions.length,
          inboundMessages: interactions.filter(i => i.direction === "INBOUND").length,
          outboundMessages: interactions.filter(i => i.direction === "OUTBOUND").length,
          totalCalls: calls.length,
          totalChanges: audits.length,
        },
      },
    });
  } catch (error) {
    logger.error("Activity timeline error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: "Failed to fetch activity timeline" },
      { status: 500 }
    );
  }
}
