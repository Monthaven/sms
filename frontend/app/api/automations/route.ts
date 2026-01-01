/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Automations API - System automations status + user-defined automation CRUD
 * GET  - Returns system automations + user-defined automations
 * POST - Create new user-defined automation
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const db = prisma as any;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SystemAutomation = {
  id: string;
  name: string;
  cadence: string;
  owner: string;
  status: "healthy" | "warning" | "paused";
  lastRun: string;
  type: "system";
};

type UserAutomation = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  actionType: string;
  totalExecutions: number;
  successRate: number;
  lastExecutedAt: string | null;
  type: "user";
};

// ============================================================================
// GET - List all automations (system + user-defined)
// ============================================================================

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type'); // 'system', 'user', or null for both
  const activeOnly = searchParams.get('active') === 'true';

  // Build response
  const response: {
    system: SystemAutomation[];
    user: UserAutomation[];
    total: number;
  } = {
    system: [],
    user: [],
    total: 0,
  };

  // Get system automations (unless filtering to user only)
  if (type !== 'user') {
    const systemAutomations = await getSystemAutomations();
    response.system = systemAutomations;
  }

  // Get user-defined automations (unless filtering to system only)
  if (type !== 'system' && db.automation) {
    try {
      const where: any = {};
      if (activeOnly) where.isActive = true;

      const userAutomations = await db.automation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      response.user = userAutomations.map((auto: any) => ({
        id: auto.id,
        name: auto.name,
        description: auto.description,
        isActive: auto.isActive,
        triggerType: auto.triggerType,
        actionType: auto.actionType,
        totalExecutions: auto.totalExecutions,
        successRate: auto.totalExecutions > 0 
          ? Math.round((auto.successCount / auto.totalExecutions) * 100) 
          : 0,
        lastExecutedAt: auto.lastExecutedAt?.toISOString() || null,
        type: 'user' as const,
      }));
    } catch (err: any) {
      console.debug('User automations query failed:', err?.message);
    }
  }

  response.total = response.system.length + response.user.length;
  return NextResponse.json(response);
}

// ============================================================================
// POST - Create new user-defined automation
// ============================================================================

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db.automation) {
    return NextResponse.json(
      { error: "Automation model not available. Run prisma migrate." },
      { status: 501 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    const { name, triggerType, actionType } = body;
    
    if (!name || !triggerType || !actionType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, triggerType, actionType' },
        { status: 400 }
      );
    }

    // Validate trigger type
    const validTriggerTypes = [
      'lead_score_change',
      'new_lead',
      'contact_update',
      'call_ended',
      'call_missed',
      'sms_received',
      'sms_no_response',
      'status_change',
      'tier_upgrade',
      'schedule',
    ];

    if (!validTriggerTypes.includes(triggerType)) {
      return NextResponse.json(
        { error: `Invalid triggerType. Valid: ${validTriggerTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate action type
    const validActionTypes = [
      'send_sms',
      'send_sms_template',
      'enroll_sequence',
      'remove_from_sequence',
      'assign_agent',
      'update_status',
      'update_tier',
      'send_notification',
      'create_task',
      'webhook',
    ];

    if (!validActionTypes.includes(actionType)) {
      return NextResponse.json(
        { error: `Invalid actionType. Valid: ${validActionTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const automation = await db.automation.create({
      data: {
        name,
        description: body.description || null,
        isActive: body.isActive ?? false,
        triggerType,
        triggerConditions: body.triggerConditions || null,
        actionType,
        actionConfig: body.actionConfig || null,
        maxExecutionsPerDay: body.maxExecutionsPerDay ?? 100,
        targetTiers: body.targetTiers || [],
        targetStatuses: body.targetStatuses || [],
      },
    });

    return NextResponse.json({ automation }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create automation:', error);
    return NextResponse.json(
      { error: 'Failed to create automation', details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper: Get system automations (ingestion jobs, webhooks, heartbeat)
// ============================================================================

async function getSystemAutomations(): Promise<SystemAutomation[]> {
  const ingestionDelegate = db?.ingestionJob;
  const webhookDelegate = db?.webhookLog;
  let jobs: any[] = [];
  let webhooks: any[] = [];

  try {
    const results = await Promise.all([
      ingestionDelegate
        ? ingestionDelegate.findMany({
            orderBy: { startedAt: "desc" },
            take: 3,
            include: { startedBy: { select: { name: true, email: true } } },
          })
        : Promise.resolve([]),
      webhookDelegate
        ? webhookDelegate.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
    ]);
    jobs = results[0] || [];
    webhooks = results[1] || [];
  } catch (err: any) {
    console.debug("System automations query failed:", err?.message);
    jobs = [];
    webhooks = [];
  }

  const latestJob = jobs[0];
  const latestWebhook = webhooks[0];

  return [
    {
      id: "automation-ingestion",
      name: "Neon CSV Intake",
      cadence: "Manual / script:import-staged",
      owner: latestJob?.startedBy?.name ?? latestJob?.startedBy?.email ?? "Engine",
      status: deriveJobStatus(latestJob),
      lastRun: latestJob
        ? (latestJob.finishedAt ?? latestJob.startedAt).toISOString()
        : "never",
      type: "system",
    },
    {
      id: "automation-webhook",
      name: "EzTexting Webhook Listener",
      cadence: "Realtime",
      owner: "Storefront",
      status: deriveWebhookStatus(latestWebhook),
      lastRun: latestWebhook ? latestWebhook.createdAt.toISOString() : "never",
      type: "system",
    },
    {
      id: "automation-heartbeat",
      name: "Assignment Heartbeat",
      cadence: "*/15 * * * *",
      owner: "Command Center",
      status: deriveHeartbeatStatus(jobs),
      lastRun: jobs[1]?.startedAt?.toISOString() ?? "queued",
      type: "system",
    },
  ];
}

type AutomationStatus = SystemAutomation["status"];
type AutomationPayload = { status: AutomationStatus };

function deriveJobStatus(job?: {
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
}): AutomationStatus {
  if (!job) return "warning";
  if (job.status === "FAILED") return "paused";

  const diffMs = Date.now() - job.startedAt.getTime();
  if (diffMs < 1000 * 60 * 60 * 6) return "healthy";
  return "warning";
}

function deriveWebhookStatus(latest?: { createdAt: Date }): AutomationStatus {
  if (!latest) return "warning";
  const diffMs = Date.now() - latest.createdAt.getTime();
  if (diffMs < 1000 * 60 * 5) return "healthy";
  if (diffMs < 1000 * 60 * 30) return "warning";
  return "paused";
}

function deriveHeartbeatStatus(jobs: { status: string }[]): AutomationStatus {
  const failures = jobs.filter((job) => job.status === "FAILED").length;
  if (failures >= 2) return "paused";
  if (failures === 1) return "warning";
  return "healthy";
}
