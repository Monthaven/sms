"use client";

import { useQuery } from "@tanstack/react-query";

export type IngestionJob = {
  id: string;
  fileName: string;
  campaignId?: string | null;
  campaign?: { name: string | null } | null;
  status: string;
  rowsProcessed: number;
  contactsCreated: number;
  leadsCreated: number;
  startedAt: string;
  finishedAt?: string | null;
  durationSeconds?: number | null;
  errorMessage?: string | null;
};

export type WebhookLog = {
  id: string;
  provider: string;
  direction: string;
  status: string;
  statusCode?: number | null;
  errorMessage?: string | null;
  createdAt: string;
};

async function fetchIngestionJobs(): Promise<IngestionJob[]> {
  try {
    const res = await fetch("/api/telemetry/ingestion");
    if (!res.ok) {
      console.warn("fetchIngestionJobs non-ok response:", res.status);
      return [];
    }
    return (await res.json()) as IngestionJob[];
  } catch (err) {
    console.warn("fetchIngestionJobs failed:", err);
    return [];
  }
}

async function fetchWebhookLogs(): Promise<WebhookLog[]> {
  try {
    const res = await fetch("/api/telemetry/webhooks");
    if (!res.ok) {
      console.warn("fetchWebhookLogs non-ok response:", res.status);
      return [];
    }
    return (await res.json()) as WebhookLog[];
  } catch (err) {
    console.warn("fetchWebhookLogs failed:", err);
    return [];
  }
}

export function useIngestionJobs() {
  return useQuery<IngestionJob[]>({
    queryKey: ["ingestion-jobs"],
    queryFn: fetchIngestionJobs,
    refetchInterval: 30000,
  });
}

export function useWebhookLogs() {
  return useQuery<WebhookLog[]>({
    queryKey: ["webhook-logs"],
    queryFn: fetchWebhookLogs,
    refetchInterval: 30000,
  });
}
