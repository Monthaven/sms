/**
 * PROPRIETARY — Always Improving LLC
 * DNC Check API - Check if phone is on DNC list
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dnc/check?phone=+1234567890
 * Check if a phone number is on DNC list
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Phone parameter required" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  // Check DNC list
  const dncEntry = await prisma.dncEntry.findUnique({
    where: { phone: normalizedPhone },
    select: {
      id: true,
      source: true,
      notes: true,
      addedAt: true,
    },
  });

  // Also check if contact has opted out
  const contact = await prisma.contact.findFirst({
    where: { phoneE164: normalizedPhone },
    select: {
      doNotContact: true,
      callConsent: true,
      doNotContactReason: true,
    },
  });

  const isBlocked = !!(dncEntry || contact?.doNotContact);

  return NextResponse.json({
    phone: normalizedPhone,
    isBlocked,
    dncEntry: dncEntry || null,
    contactOptOut: contact?.doNotContact || false,
    callConsent: contact?.callConsent ?? null,
    reason: dncEntry?.notes || contact?.doNotContactReason || null,
  });
}

/**
 * POST /api/dnc/check - Bulk check multiple phones
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const phones: string[] = body.phones;

  if (!phones || !Array.isArray(phones) || phones.length === 0) {
    return NextResponse.json({ error: "phones array required" }, { status: 400 });
  }

  if (phones.length > 1000) {
    return NextResponse.json({ error: "Max 1000 phones per request" }, { status: 400 });
  }

  const normalizedPhones = phones.map(p => normalizePhone(p)).filter((p): p is string => p !== null);

  // Get DNC entries
  const dncEntries = await prisma.dncEntry.findMany({
    where: { phone: { in: normalizedPhones } },
    select: { phone: true },
  });
  const dncSet = new Set(dncEntries.map(e => e.phone));

  // Get opted-out contacts
  const optedOutContacts = await prisma.contact.findMany({
    where: { 
      phoneE164: { in: normalizedPhones },
      doNotContact: true,
    },
    select: { phoneE164: true },
  });
  const optOutSet = new Set(optedOutContacts.map(c => c.phoneE164));

  // Build results
  const results = normalizedPhones.map(phone => ({
    phone,
    isBlocked: dncSet.has(phone!) || optOutSet.has(phone!),
    onDncList: dncSet.has(phone!),
    optedOut: optOutSet.has(phone!),
  }));

  const blockedCount = results.filter(r => r.isBlocked).length;

  return NextResponse.json({
    results,
    summary: {
      total: phones.length,
      blocked: blockedCount,
      allowed: phones.length - blockedCount,
    },
  });
}
