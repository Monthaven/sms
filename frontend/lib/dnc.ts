/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { db } from "./db";
import { normalizePhone } from "./phone-utils";

export interface DncCheckResult {
  blocked: boolean;
  reason?: string;
  source?: string;
  addedAt?: Date;
  expiresAt?: Date | null;
}

/**
 * Check if a phone number is on the DNC list
 */
export async function checkDnc(phone: string): Promise<DncCheckResult> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { blocked: false };
  }

  // Check DncEntry table
  const dncEntry = await db.dncEntry.findUnique({
    where: { phone: normalized },
  });

  if (dncEntry) {
    // Check if expired
    if (dncEntry.expiresAt && dncEntry.expiresAt < new Date()) {
      // Entry has expired, remove it
      await db.dncEntry.delete({ where: { phone: normalized } });
      return { blocked: false };
    }

    return {
      blocked: true,
      reason: dncEntry.notes || "On DNC list",
      source: dncEntry.source,
      addedAt: dncEntry.addedAt,
      expiresAt: dncEntry.expiresAt,
    };
  }

  // Check legacy DncList table
  const legacyDnc = await db.dncList.findUnique({
    where: { phoneE164: normalized },
  });

  if (legacyDnc) {
    return {
      blocked: true,
      reason: legacyDnc.reason || "On legacy DNC list",
      source: "LEGACY",
      addedAt: legacyDnc.createdAt,
    };
  }

  // Check Contact doNotContact flag
  const contact = await db.contact.findUnique({
    where: { phoneE164: normalized },
    select: { doNotContact: true, doNotContactReason: true },
  });

  if (contact?.doNotContact) {
    return {
      blocked: true,
      reason: contact.doNotContactReason || "Contact marked as DNC",
      source: "CONTACT",
    };
  }

  return { blocked: false };
}

/**
 * Add a phone number to the DNC list
 */
export async function addToDnc(
  phone: string,
  source: "INTERNAL" | "FTC" | "STATE" | "CARRIER" | "LITIGATION" = "INTERNAL",
  notes?: string,
  addedBy?: string,
  expiresAt?: Date
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    await db.dncEntry.upsert({
      where: { phone: normalized },
      create: {
        phone: normalized,
        source,
        notes,
        addedBy,
        expiresAt,
      },
      update: {
        source,
        notes,
        addedBy,
        expiresAt,
        addedAt: new Date(),
      },
    });

    // Also update Contact if exists
    await db.contact.updateMany({
      where: { phoneE164: normalized },
      data: {
        doNotContact: true,
        doNotContactReason: source,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to add to DNC:", error);
    return { success: false, error: "Database error" };
  }
}

/**
 * Remove a phone number from the DNC list
 */
export async function removeFromDnc(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    await db.dncEntry.delete({
      where: { phone: normalized },
    }).catch(() => {
      // Entry might not exist, that's okay
    });

    // Also update Contact if exists
    await db.contact.updateMany({
      where: { phoneE164: normalized },
      data: {
        doNotContact: false,
        doNotContactReason: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to remove from DNC:", error);
    return { success: false, error: "Database error" };
  }
}

/**
 * Bulk import phone numbers to DNC list
 */
export async function importDncList(
  phones: string[],
  source: "INTERNAL" | "FTC" | "STATE" | "CARRIER" | "LITIGATION" = "INTERNAL",
  addedBy?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const phone of phones) {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      results.failed++;
      results.errors.push(`Invalid phone: ${phone}`);
      continue;
    }

    try {
      await db.dncEntry.upsert({
        where: { phone: normalized },
        create: {
          phone: normalized,
          source,
          addedBy,
        },
        update: {
          source,
          addedBy,
          addedAt: new Date(),
        },
      });
      results.success++;
    } catch {
      results.failed++;
      results.errors.push(`Failed to add: ${phone}`);
    }
  }

  return results;
}

/**
 * Search DNC list
 */
export async function searchDnc(
  query: string,
  options?: { limit?: number; offset?: number; source?: string }
) {
  const normalized = normalizePhone(query);
  const searchPhone = normalized || query;

  const where: Record<string, unknown> = {
    phone: { contains: searchPhone.replace(/\+/g, "") },
  };

  if (options?.source) {
    where.source = options.source;
  }

  const [entries, total] = await Promise.all([
    db.dncEntry.findMany({
      where,
      orderBy: { addedAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    db.dncEntry.count({ where }),
  ]);

  return { entries, total };
}

/**
 * Get DNC statistics
 */
export async function getDncStats() {
  const [total, bySource] = await Promise.all([
    db.dncEntry.count(),
    db.dncEntry.groupBy({
      by: ["source"],
      _count: { source: true },
    }),
  ]);

  const sourceBreakdown: Record<string, number> = {};
  bySource.forEach((item) => {
    sourceBreakdown[item.source] = item._count.source;
  });

  return {
    total,
    bySource: sourceBreakdown,
  };
}
