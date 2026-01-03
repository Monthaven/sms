/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logger, generateRequestId } from '@/lib/logger';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: '/api/search', requestId });

  // Auth check
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  // Rate limiting - searches can be expensive
  const clientIP = getClientIP(request);
  const rateLimit = await checkRateLimit(clientIP, RATE_LIMITS.API_GENERAL);
  
  if (!rateLimit.success) {
    log.warn('Rate limit exceeded', { clientIP });
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { 
        status: 429,
        headers: rateLimitHeaders(rateLimit)
      }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    if (!q || q.trim().length === 0) {
      return NextResponse.json([]);
    }
    
    // Sanitize search term - limit length to prevent DoS
    const term = q.trim().slice(0, 100);
    
    log.debug('Search query', { term, length: term.length });

    // Search contacts and properties in parallel for better performance
    const [contacts, properties] = await Promise.all([
      prisma.contact.findMany({
        where: {
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { phoneE164: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 20,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneE164: true,
          leads: { select: { id: true }, take: 1 },
        },
      }),
      prisma.property.findMany({
        where: {
          OR: [
            { addressLine1: { contains: term, mode: 'insensitive' } },
            { city: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 20,
        select: {
          id: true,
          addressLine1: true,
          city: true,
          leads: { select: { id: true }, take: 1 },
        },
      }),
    ]);

    const results: any[] = [];

    for (const c of contacts) {
      results.push({
        type: 'contact',
        leadId: c.leads[0]?.id ?? null,
        id: c.id,
        display: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        phone: c.phoneE164,
      });
    }

    for (const p of properties) {
      results.push({
        type: 'property',
        leadId: p.leads[0]?.id ?? null,
        id: p.id,
        display: `${p.addressLine1}, ${p.city}`,
      });
    }

    // Limit to top 20 overall
    const finalResults = results.slice(0, 20);
    
    log.debug('Search complete', { resultCount: finalResults.length });

    return NextResponse.json(finalResults, {
      headers: rateLimitHeaders(rateLimit)
    });
  } catch (err: any) {
    log.error('Search failed', {}, err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
