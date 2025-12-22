/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    if (!q || q.trim().length === 0) return NextResponse.json([]);
    const term = q.trim();

    // Search contacts
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { phoneE164: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });

    // Search properties
    const properties = await prisma.property.findMany({
      where: {
        OR: [
          { addressLine1: { contains: term, mode: 'insensitive' } },
          { city: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });

    const results: any[] = [];

    for (const c of contacts) {
      // Find a lead for navigation
      const lead = await prisma.lead.findFirst({ where: { contactId: c.id } });
      results.push({
        type: 'contact',
        leadId: lead?.id ?? null,
        id: c.id,
        display: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        phone: c.phoneE164,
      });
    }

    for (const p of properties) {
      const lead = await prisma.lead.findFirst({ where: { propertyId: p.id } });
      results.push({
        type: 'property',
        leadId: lead?.id ?? null,
        id: p.id,
        display: `${p.addressLine1}, ${p.city}`,
      });
    }

    // Limit to top 20 overall
    return NextResponse.json(results.slice(0, 20));
  } catch (err) {
    console.error('[api/search] error', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
