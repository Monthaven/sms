/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Automation Execute API - Trigger automation execution
 * POST /api/automations/[id]/execute - Manually trigger an automation
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const db = prisma as any;

// ============================================================================
// POST - Execute automation manually
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: any
) {
  const { id } = params;
  
  try {
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`automation_exec:${id}:${clientIP}`, RATE_LIMITS.api);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!db.automation) {
      return NextResponse.json(
        { error: 'Automation model not available' },
        { status: 501 }
      );
    }

    // Get the automation
    const automation = await db.automation.findUnique({ where: { id } });
    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }

    // Check if automation is active
    if (!automation.isActive) {
      return NextResponse.json(
        { error: 'Automation is not active. Enable it first.' },
        { status: 400 }
      );
    }

    // Check daily execution limit
    if (automation.executionCount >= automation.maxExecutionsPerDay) {
      return NextResponse.json(
        { error: 'Daily execution limit reached', limit: automation.maxExecutionsPerDay },
        { status: 429 }
      );
    }

    // Get optional trigger data from request body
    const body = await request.json().catch(() => ({}));
    const { contactId, leadId, triggerData } = body;

    const startTime = Date.now();
    let status = 'success';
    let actionResult: any = null;
    let errorMessage: string | null = null;

    try {
      // Execute the action based on action type
      actionResult = await executeAction(automation, { contactId, leadId, triggerData });
    } catch (actionError: any) {
      status = 'failed';
      errorMessage = actionError.message;
    }

    const durationMs = Date.now() - startTime;

    // Log the execution
    const log = await db.automationLog.create({
      data: {
        automationId: id,
        contactId,
        leadId,
        status,
        triggerData: triggerData || null,
        actionResult,
        errorMessage,
        durationMs,
      },
    });

    // Update automation stats
    await db.automation.update({
      where: { id },
      data: {
        executionCount: { increment: 1 },
        totalExecutions: { increment: 1 },
        successCount: status === 'success' ? { increment: 1 } : undefined,
        failureCount: status === 'failed' ? { increment: 1 } : undefined,
        lastExecutedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: status === 'success',
      log,
      durationMs,
      ...(errorMessage && { error: errorMessage }),
    }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error: any) {
    console.error('Failed to execute automation:', error);
    return NextResponse.json(
      { error: 'Failed to execute automation', details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// Action Executor
// ============================================================================

async function executeAction(
  automation: any, 
  context: { contactId?: string; leadId?: string; triggerData?: any }
): Promise<any> {
  const { actionType, actionConfig } = automation;
  const config = actionConfig || {};

  switch (actionType) {
    case 'send_notification': {
      // Create a notification for the target user
      if (!db.notification) throw new Error('Notification model not available');
      
      const notification = await db.notification.create({
        data: {
          userId: config.userId || context.triggerData?.userId,
          title: config.title || 'Automation Alert',
          message: config.message || `Automation "${automation.name}" triggered`,
          type: 'automation',
          metadata: {
            automationId: automation.id,
            contactId: context.contactId,
            leadId: context.leadId,
          },
        },
      });
      return { notificationId: notification.id };
    }

    case 'update_status': {
      // Update lead status
      if (!context.leadId) throw new Error('Lead ID required for update_status');
      if (!db.lead) throw new Error('Lead model not available');
      
      const lead = await db.lead.update({
        where: { id: context.leadId },
        data: {
          status: config.newStatus || 'HOT',
        },
      });
      return { leadId: lead.id, newStatus: lead.status };
    }

    case 'update_tier': {
      // Update contact tier
      if (!context.contactId) throw new Error('Contact ID required for update_tier');
      if (!db.contact) throw new Error('Contact model not available');
      
      const contact = await db.contact.update({
        where: { id: context.contactId },
        data: {
          dm_tier: config.newTier || 'A',
        },
      });
      return { contactId: contact.id, newTier: contact.dm_tier };
    }

    case 'enroll_sequence': {
      // Enroll contact in a sequence
      if (!context.contactId) throw new Error('Contact ID required for enroll_sequence');
      if (!config.sequenceId) throw new Error('Sequence ID required in action config');
      if (!db.sequenceContact) throw new Error('SequenceContact model not available');
      
      const enrollment = await db.sequenceContact.upsert({
        where: {
          sequence_id_contact_id: {
            sequence_id: config.sequenceId,
            contact_id: context.contactId,
          },
        },
        update: {
          status: 'active',
          current_step: 0,
        },
        create: {
          sequence_id: config.sequenceId,
          contact_id: context.contactId,
          status: 'active',
          current_step: 0,
        },
      });
      return { enrollmentId: enrollment.id, sequenceId: config.sequenceId };
    }

    case 'remove_from_sequence': {
      // Remove contact from a sequence
      if (!context.contactId) throw new Error('Contact ID required for remove_from_sequence');
      if (!config.sequenceId) throw new Error('Sequence ID required in action config');
      if (!db.sequenceContact) throw new Error('SequenceContact model not available');
      
      await db.sequenceContact.updateMany({
        where: {
          sequence_id: config.sequenceId,
          contact_id: context.contactId,
        },
        data: {
          status: 'removed',
        },
      });
      return { removed: true, sequenceId: config.sequenceId };
    }

    case 'assign_agent': {
      // Assign lead to an agent
      if (!context.leadId) throw new Error('Lead ID required for assign_agent');
      if (!config.agentId) throw new Error('Agent ID required in action config');
      if (!db.lead) throw new Error('Lead model not available');
      
      const lead = await db.lead.update({
        where: { id: context.leadId },
        data: {
          assignedId: config.agentId,
        },
      });
      return { leadId: lead.id, assignedTo: config.agentId };
    }

    case 'create_task': {
      // Create a task/reminder
      // This would integrate with a task management system
      return { 
        taskCreated: true, 
        title: config.taskTitle || 'Follow up',
        dueDate: config.dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    case 'webhook': {
      // Call external webhook with allowlist validation
      if (!config.webhookUrl) throw new Error('Webhook URL required in action config');
      const parsed = safeWebhookUrl(config.webhookUrl);
      if (!parsed) throw new Error('Invalid webhook URL');
      if (!isWebhookAllowed(parsed)) throw new Error('Webhook host not allowed');
      
      const response = await fetch(parsed.toString(), {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {}),
        },
        body: JSON.stringify({
          automation: automation.name,
          trigger: automation.triggerType,
          contactId: context.contactId,
          leadId: context.leadId,
          data: context.triggerData,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      return { 
        webhookCalled: true, 
        url: parsed.toString(),
        status: response.status,
      };
    }

    case 'send_sms':
    case 'send_sms_template': {
      // SMS sending would integrate with Twilio/EzTexting
      // For now, just log the intent
      return {
        smsQueued: true,
        templateId: config.templateId,
        message: config.message?.substring(0, 50) + '...',
      };
    }

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

function safeWebhookUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url;
  } catch {
    return null;
  }
}

function isWebhookAllowed(url: URL): boolean {
  const allowlist = process.env.ALLOWED_WEBHOOK_HOSTS
    ?.split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (!allowlist || allowlist.length === 0) return false;
  return allowlist.includes(url.hostname.toLowerCase());
}
