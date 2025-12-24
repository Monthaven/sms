/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const db = prisma as any;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AutomationPayload = {
  id: string;
  name: string;
  cadence: string;
  owner: string;
  status: "healthy" | "warning" | "paused";
  lastRun: string;
};

export async function GET() {
  // Auth check for internal dashboard route
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    // If the database/table is missing (common in local dev), return safe defaults
    console.debug && console.debug("Automations route: prisma query failed, returning defaults.", err?.code || err?.message || err);
    jobs = [];
    webhooks = [];
  }

  const latestJob = jobs[0];
  const latestWebhook = webhooks[0];

  const automations: AutomationPayload[] = [
    {
      id: "automation-ingestion",
      name: "Neon CSV Intake",
      cadence: "Manual / script:import-staged",
      owner:
        latestJob?.startedBy?.name ??
        latestJob?.startedBy?.email ??
        "Engine",
      status: deriveJobStatus(latestJob),
      lastRun: latestJob
        ? (latestJob.finishedAt ?? latestJob.startedAt).toISOString()
        : "never",
    },
    {
      id: "automation-webhook",
      name: "EzTexting Webhook Listener",
      cadence: "Realtime",
      owner: "Storefront",
      status: deriveWebhookStatus(latestWebhook),
      lastRun: latestWebhook
        ? latestWebhook.createdAt.toISOString()
        : "never",
    },
    {
      id: "automation-heartbeat",
      name: "Assignment Heartbeat",
      cadence: "*/15 * * * *",
      owner: "Command Center",
      status: deriveHeartbeatStatus(jobs),
      lastRun: jobs[1]?.startedAt?.toISOString() ?? "queued",
    },
  ];

  return NextResponse.json(automations);
}

function deriveJobStatus(job?: {
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
}): AutomationPayload["status"] {
  if (!job) return "warning";
  if (job.status === "FAILED") return "paused";

  const diffMs = Date.now() - job.startedAt.getTime();
  if (diffMs < 1000 * 60 * 60 * 6) return "healthy";
  return "warning";
}

function deriveWebhookStatus(latest?: { createdAt: Date }): AutomationPayload["status"] {
  if (!latest) return "warning";
  const diffMs = Date.now() - latest.createdAt.getTime();
  if (diffMs < 1000 * 60 * 5) return "healthy";
  if (diffMs < 1000 * 60 * 30) return "warning";
  return "paused";
}

function deriveHeartbeatStatus(jobs: { status: string }[]): AutomationPayload["status"] {
  const failures = jobs.filter((job) => job.status === "FAILED").length;
  if (failures >= 2) return "paused";
  if (failures === 1) return "warning";
  return "healthy";
}
