/**
 * PROPRIETARY — Always Improving LLC
 * DNC (Do Not Contact) List Management API
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";
import { z } from "zod";
import { normalizePhone } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const addDncSchema = z.object({
  phone: z.string().min(10).max(15),
  source: z.enum(["INTERNAL", "FTC", "STATE", "CARRIER", "LITIGATION"]),
  reason: z.string().optional(),
});

const bulkAddSchema = z.object({
  phones: z.array(z.string().min(10).max(15)),
  source: z.enum(["INTERNAL", "FTC", "STATE", "CARRIER", "LITIGATION"]),
  reason: z.string().optional(),
});

/**
 * GET - List DNC entries with pagination
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const search = searchParams.get("search");
  const source = searchParams.get("source");

  const whereCondition: any = {};

  if (search) {
    whereCondition.OR = [
      { phone: { contains: search } },
      { reason: { contains: search, mode: "insensitive" } },
    ];
  }

  if (source) {
    whereCondition.source = source;
  }

  const [entries, total] = await Promise.all([
    prisma.dncEntry.findMany({
      where: whereCondition,
      orderBy: { addedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.dncEntry.count({ where: whereCondition }),
  ]);

  return NextResponse.json({
    entries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

/**
 * POST - Add number to DNC list
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/dnc", requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Check for bulk operation
    if (body.phones) {
      const parsed = bulkAddSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ 
          error: "Validation failed", 
          details: parsed.error.flatten() 
        }, { status: 400 });
      }

      const { phones, source, reason } = parsed.data;
      const normalizedPhones = phones.map(p => normalizePhone(p)).filter((p): p is string => p !== null);
      
      // Filter out already-existing entries
      const existing = await prisma.dncEntry.findMany({
        where: { phone: { in: normalizedPhones } },
        select: { phone: true },
      });
      const existingSet = new Set(existing.map(e => e.phone));
      const newPhones = normalizedPhones.filter(p => !existingSet.has(p));

      if (newPhones.length > 0) {
        await prisma.dncEntry.createMany({
          data: newPhones.map(phone => ({
            phone,
            source,
            notes: reason || null,
            addedBy: user.id,
          })),
          skipDuplicates: true,
        });

        // Also update contacts
        await prisma.contact.updateMany({
          where: { phoneE164: { in: newPhones } },
          data: { 
            doNotContact: true,
            doNotContactReason: reason || `Added to DNC: ${source}`,
          },
        });
      }

      log.info("Bulk DNC add", { 
        total: phones.length, 
        added: newPhones.length, 
        skipped: existingSet.size,
        userId: user.id,
      });

      return NextResponse.json({ 
        success: true, 
        added: newPhones.length,
        skipped: phones.length - newPhones.length,
      });
    }

    // Single add
    const parsed = addDncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { phone, source, reason } = parsed.data;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    // Check if already exists
    const existing = await prisma.dncEntry.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existing) {
      return NextResponse.json({ 
        error: "Phone number already on DNC list",
        existingEntry: existing,
      }, { status: 409 });
    }

    const entry = await prisma.dncEntry.create({
      data: {
        phone: normalizedPhone,
        source,
        notes: reason || null,
        addedBy: user.id,
      },
    });

    // Update any existing contacts
    await prisma.contact.updateMany({
      where: { phoneE164: normalizedPhone },
      data: { 
        doNotContact: true,
        doNotContactReason: reason || `Added to DNC: ${source}`,
      },
    });

    log.info("DNC entry added", { phone: normalizedPhone, source, userId: user.id });

    return NextResponse.json({ entry }, { status: 201 });

  } catch (error: any) {
    log.error("Failed to add DNC entry", { error: error.message });
    return NextResponse.json({ error: "Failed to add entry" }, { status: 500 });
  }
}

/**
 * DELETE - Remove from DNC list
 */
export async function DELETE(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/dnc", requestId });

  const user = await getCurrentUser();
  if (!user || !["ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const id = searchParams.get("id");

  if (!phone && !id) {
    return NextResponse.json({ error: "Provide phone or id" }, { status: 400 });
  }

  try {
    let deleted;
    
    if (id) {
      deleted = await prisma.dncEntry.delete({
        where: { id },
      });
    } else if (phone) {
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
      }
      deleted = await prisma.dncEntry.delete({
        where: { phone: normalizedPhone },
      });
    }

    // Optionally restore contact
    if (deleted) {
      await prisma.contact.updateMany({
        where: { phoneE164: deleted.phone },
        data: { 
          doNotContact: false,
          doNotContactReason: null,
        },
      });
    }

    log.info("DNC entry removed", { phone: deleted?.phone, userId: user.id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    log.error("Failed to remove DNC entry", { error: error.message });
    return NextResponse.json({ error: "Failed to remove entry" }, { status: 500 });
  }
}
