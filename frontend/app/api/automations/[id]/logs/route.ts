/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Automation Logs API - View execution history
 * GET /api/automations/[id]/logs - Get logs for an automation
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logger, generateRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const db = prisma as any;

export async function GET(
  request: NextRequest,
  { params }: any
) {
  const { id } = params;
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!db.automationLog) {
      return NextResponse.json(
        { error: 'AutomationLog model not available' },
        { status: 501 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status'); // success, failed, skipped

    const where: any = { automationId: id };
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      db.automationLog.findMany({
        where,
        orderBy: { executedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.automationLog.count({ where }),
    ]);

    // Calculate stats
    const statsWhere = { automationId: id };
    const [successCount, failedCount] = await Promise.all([
      db.automationLog.count({ where: { ...statsWhere, status: 'success' } }),
      db.automationLog.count({ where: { ...statsWhere, status: 'failed' } }),
    ]);

    const avgDuration = await db.automationLog.aggregate({
      where: statsWhere,
      _avg: { durationMs: true },
    });

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
      stats: {
        successCount,
        failedCount,
        successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
        avgDurationMs: Math.round(avgDuration._avg?.durationMs || 0),
      },
    });
  } catch (error: any) {
    const requestId = generateRequestId();
    logger.error('Failed to get automation logs', { requestId, automationId: id }, error);
    return NextResponse.json(
      { error: 'Failed to get automation logs', requestId, details: error.message },
      { status: 500 }
    );
  }
}
