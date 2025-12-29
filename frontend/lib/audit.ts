/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { db } from "./db";
import { Prisma } from "@prisma/client";

export interface AuditLogEntry {
  action: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        userId: entry.userId || "system",
        metadata: entry.metadata ? (entry.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to log audit entry:", error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(filters: {
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.action) where.action = { contains: filters.action };

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
    if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    }),
    db.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Mask PII in an object
 */
export function maskPii(obj: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...obj };

  const piiPatterns: Record<string, (v: string) => string> = {
    phone: (v) => v.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2"),
    email: (v) => v.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
    ssn: () => "***-**-****",
    creditCard: (v) => v.replace(/\d{12}(\d{4})/, "****-****-****-$1"),
  };

  const sensitiveKeys = [
    "phone",
    "phoneNumber",
    "mobile",
    "cell",
    "email",
    "emailAddress",
    "ssn",
    "socialSecurity",
    "creditCard",
    "cardNumber",
    "password",
    "passwordHash",
    "token",
    "apiKey",
    "secret",
  ];

  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();
    const value = masked[key];

    // Check for sensitive keys
    const isSensitive = sensitiveKeys.some(
      (sk) => lowerKey.includes(sk.toLowerCase())
    );

    if (isSensitive && typeof value === "string") {
      // Determine masking pattern
      if (lowerKey.includes("phone") || lowerKey.includes("mobile") || lowerKey.includes("cell")) {
        masked[key] = piiPatterns.phone(value);
      } else if (lowerKey.includes("email")) {
        masked[key] = piiPatterns.email(value);
      } else if (lowerKey.includes("ssn") || lowerKey.includes("social")) {
        masked[key] = piiPatterns.ssn(value);
      } else if (lowerKey.includes("card") || lowerKey.includes("credit")) {
        masked[key] = piiPatterns.creditCard(value);
      } else {
        // Generic masking for passwords/tokens/secrets
        masked[key] = "********";
      }
    }

    // Recursively mask nested objects
    if (value && typeof value === "object" && !Array.isArray(value)) {
      masked[key] = maskPii(value as Record<string, unknown>);
    }

    // Handle arrays of objects
    if (Array.isArray(value)) {
      masked[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? maskPii(item as Record<string, unknown>)
          : item
      );
    }
  }

  return masked;
}

// Common audit actions
export const AUDIT_ACTIONS = {
  // User actions
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DELETED: "user.deleted",
  USER_STATUS_CHANGE: "user.status_change",

  // Call actions
  CALL_INITIATED: "call.initiated",
  CALL_ANSWERED: "call.answered",
  CALL_ENDED: "call.ended",
  CALL_TRANSFERRED: "call.transferred",
  CALL_HELD: "call.held",
  CALL_MONITORED: "call.monitored",

  // SMS actions
  SMS_SENT: "sms.sent",
  SMS_RECEIVED: "sms.received",
  SMS_FAILED: "sms.failed",
  SMS_SCHEDULED: "sms.scheduled",

  // Lead actions
  LEAD_CREATED: "lead.created",
  LEAD_CLAIMED: "lead.claimed",
  LEAD_RELEASED: "lead.released",
  LEAD_DISPOSITIONED: "lead.dispositioned",
  LEAD_ASSIGNED: "lead.assigned",

  // DNC actions
  DNC_ADDED: "dnc.added",
  DNC_REMOVED: "dnc.removed",
  DNC_IMPORTED: "dnc.imported",

  // Template actions
  TEMPLATE_CREATED: "template.created",
  TEMPLATE_UPDATED: "template.updated",
  TEMPLATE_DELETED: "template.deleted",

  // Settings actions
  SETTINGS_UPDATED: "settings.updated",
  FORWARDING_UPDATED: "forwarding.updated",

  // Admin actions
  ADMIN_USER_CREATED: "admin.user_created",
  ADMIN_USER_UPDATED: "admin.user_updated",
  ADMIN_USER_DELETED: "admin.user_deleted",
  ADMIN_SETTINGS_CHANGED: "admin.settings_changed",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
