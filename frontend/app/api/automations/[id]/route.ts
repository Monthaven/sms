/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Automation Detail API - GET, PUT, DELETE for individual automation
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================================
// GET - Get single automation by ID
// ============================================================================

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

    const db = prisma as any;
    if (!db.automation) {
      return NextResponse.json(
        { error: 'Automation model not available' },
        { status: 501 }
      );
    }

    const automation = await db.automation.findUnique({
      where: { id },
      include: {
        logs: {
          take: 20,
          orderBy: { executedAt: 'desc' },
        },
        _count: {
          select: { logs: true },
        },
      },
    });

    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...automation,
      totalLogs: automation._count.logs,
      successRate: automation.totalExecutions > 0 
        ? Math.round((automation.successCount / automation.totalExecutions) * 100) 
        : 0,
    });
  } catch (error: any) {
    console.error('Failed to get automation:', error);
    return NextResponse.json(
      { error: 'Failed to get automation', details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Update automation
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: any
) {
  const { id } = params;
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const db = prisma as any;
    if (!db.automation) {
      return NextResponse.json(
        { error: 'Automation model not available' },
        { status: 501 }
      );
    }

    // Check automation exists
    const existing = await db.automation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }

    // Build update data (only include fields that were provided)
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.triggerType !== undefined) updateData.triggerType = body.triggerType;
    if (body.triggerConditions !== undefined) updateData.triggerConditions = body.triggerConditions;
    if (body.actionType !== undefined) updateData.actionType = body.actionType;
    if (body.actionConfig !== undefined) updateData.actionConfig = body.actionConfig;
    if (body.maxExecutionsPerDay !== undefined) updateData.maxExecutionsPerDay = body.maxExecutionsPerDay;
    if (body.targetTiers !== undefined) updateData.targetTiers = body.targetTiers;
    if (body.targetStatuses !== undefined) updateData.targetStatuses = body.targetStatuses;

    // Reset execution count if toggling on
    if (body.isActive === true && !existing.isActive) {
      updateData.executionCount = 0;
    }

    const automation = await db.automation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ automation });
  } catch (error: any) {
    console.error('Failed to update automation:', error);
    return NextResponse.json(
      { error: 'Failed to update automation', details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete automation
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: any
) {
  const { id } = params;
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = prisma as any;
    if (!db.automation) {
      return NextResponse.json(
        { error: 'Automation model not available' },
        { status: 501 }
      );
    }

    // Check automation exists
    const existing = await db.automation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }

    // Delete automation (logs will cascade delete)
    await db.automation.delete({ where: { id } });

    return NextResponse.json({ success: true, deleted: id });
  } catch (error: any) {
    console.error('Failed to delete automation:', error);
    return NextResponse.json(
      { error: 'Failed to delete automation', details: error.message },
      { status: 500 }
    );
  }
}
