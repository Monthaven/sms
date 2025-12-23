/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { prisma } from "./db";

const LOCK_DURATION_MINUTES = 30;

export type QueuePriority = "HIGH" | "MEDIUM" | "LOW" | "ALL";
export type QueueSort = "score" | "callback" | "recent";

export interface QueueFilters {
  priority?: QueuePriority;
  sort?: QueueSort;
  limit?: number;
  offset?: number;
}

export async function getLeadQueue(userId: string, filters: QueueFilters = {}) {
  const { priority = "ALL", sort = "score", limit = 20, offset = 0 } = filters;

  const where: any = {
    OR: [{ assignedToId: null }, { assignedToId: userId }, { lockExpiresAt: { lt: new Date() } }],
    status: { in: ["NEW", "QUEUED_FOR_CALL"] },
    contact: {
      doNotContact: false,
      OR: [
    { intent: null },
    { intent: { not: "NEGATIVE" } }
  ]
    },
  };

  if (priority !== "ALL") {
    where.contact.priority = priority;
  }

  const orderBy =
    sort === "callback"
      ? [{ callbackAt: "asc" as const }, { contact: { score: "desc" as const } }]
      : sort === "recent"
      ? [{ createdAt: "desc" as const }]
      : [{ contact: { priority: "desc" as const } }, { contact: { score: "desc" as const } }];

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        contact: true,
        property: true,
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { leads, total };
}

export async function claimLead(leadId: string, userId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");

  if (lead.assignedToId && lead.assignedToId !== userId) {
    if (lead.lockExpiresAt && lead.lockExpiresAt > new Date()) {
      throw new Error("Lead already claimed by another caller");
    }
  }

  const lockExpiresAt = new Date();
  lockExpiresAt.setMinutes(lockExpiresAt.getMinutes() + LOCK_DURATION_MINUTES);

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedToId: userId,
      assignedAt: new Date(),
      lockExpiresAt,
    },
    include: {
      contact: true,
      property: true,
    },
  });
}

export async function releaseLead(leadId: string, userId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");
  if (lead.assignedToId && lead.assignedToId !== userId) {
    throw new Error("Cannot release a lead claimed by another user");
  }

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedToId: null,
      assignedAt: null,
      lockExpiresAt: null,
    },
  });
}

export async function releaseExpiredLocks() {
  const result = await prisma.lead.updateMany({
    where: {
      lockExpiresAt: { lt: new Date() },
      status: { in: ["NEW", "QUEUED_FOR_CALL"] },
      assignedToId: { not: null },
    },
    data: {
      assignedToId: null,
      assignedAt: null,
      lockExpiresAt: null,
    },
  });

  return result.count;
}
