"use client";

import AgentPresence from "@/components/AgentPresence";
import HeatBadge from "@/components/HeatBadge";
import LeadActionButtons from "@/components/LeadActionButtons";
import LeadStatusBadge from "@/components/LeadStatusBadge";
import PageFooterRail from "@/components/PageFooterRail";
import { Lead } from "@/lib/api";
import { useLeads } from "@/lib/hooks/useLeads";
import { useIngestionJobs } from "@/lib/hooks/useTelemetry";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Activity,
  ArrowRight,
  CheckCircle,
  Clock4,
  Database,
  Loader2,
  FileText,
  MessageCircle,
  PhoneCall,
  RadioTower,
  RefreshCcw,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";

const mockActivity = [
  {
    time: "2m ago",
    label: "EzTexting inbound",
    detail: "Lead confirmed pricing conversation.",
  },
  {
    time: "14m ago",
    label: "Campaign Sent",
    detail: "CAMP_NOV_A delivered to 10,241 records.",
  },
  {
    time: "31m ago",
    label: "Webhook Sync",
    detail: "Neon updated RESP_STOP on 4 leads.",
  },
];

export default function DashboardOverview() {
  const { data: leadsData, isLoading, error } = useLeads({ queryKey: "dashboard" });
  const leads = useMemo<Lead[]>(() => leadsData ?? [], [leadsData]);
  const {
    data: ingestionJobs,
    isLoading: jobsLoading,
    error: jobsError,
  } = useIngestionJobs();
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryPending, startRetry] = useTransition();

  const metrics = useMemo(() => {
    const hot = leads.filter((l) =>
      ["RESP_HOT", "RESP_WARM", "CONVERSATION_ACTIVE"].includes(l.status)
    ).length;
    const queue = leads.filter((l) => l.status === "QUEUED_FOR_CALL").length;
    const sent = leads.filter((l) => l.status === "SENT").length;
    const total = leads.length;

    return {
      hot,
      queue,
      sent,
      total,
    };
  }, [leads]);

  const inboxPreview = useMemo(() => {
    return leads
      .filter((l) =>
        ["RESP_HOT", "RESP_WARM", "CONVERSATION_ACTIVE"].includes(l.status)
      )
      .slice(0, 4);
  }, [leads]);

  const actionableLeads = useMemo(() => {
    return leads.filter((l) =>
      ["RESP_HOT", "RESP_WARM", "CONVERSATION_ACTIVE", "SENT"].includes(
        l.status
      )
    );
  }, [leads]);

  const recentJobs = useMemo(
    () => ingestionJobs?.slice(0, 3) ?? [],
    [ingestionJobs]
  );

  function retryJob(jobId: string) {
    setRetryingId(jobId);
    startRetry(async () => {
      await fetch(`/api/telemetry/ingestion/${jobId}`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["ingestion-jobs"] });
      setRetryingId(null);
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-300">
        <RefreshCcw className="mr-3 h-5 w-5 animate-spin text-sky-300" />
        Loading Storefront…
      </div>
    );
  }

  return (
    <div className="space-y-10 text-slate-100">
      <section className="glass-panel border border-white/10 p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <span className="pill text-sky-200/80">Storefront · Live Inbox</span>
            <div>
              <h1 className="text-4xl font-semibold text-white">Agent Command Console</h1>
              <p className="mt-3 max-w-2xl text-base text-slate-300">
                All inbound EzTexting replies land here instantly via Neon. Track hot conversations, move
                call-eligible leads into the queue, and monitor the balance between local ingestion and cloud listeners.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-sky-300" />
              <span>Neon · Pooled Connection</span>
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
            <p className="text-sm font-semibold text-emerald-300">Operational · 24/7 capture</p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={MessageCircle}
            label="Active conversations"
            value={metrics.hot}
            sub="Hot + warm responses"
            accent="text-emerald-300"
          />
          <MetricCard
            icon={PhoneCall}
            label="Queued for call"
            value={metrics.queue}
            sub="Landline ready"
            accent="text-amber-300"
          />
          <MetricCard
            icon={RadioTower}
            label="Outbound reach"
            value={metrics.sent}
            sub="Recent SMS blasts"
            accent="text-sky-300"
          />
          <MetricCard
            icon={Activity}
            label="Total leads synced"
            value={metrics.total}
            sub="Across Neon"
            accent="text-indigo-300"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AgentPresence />
        </div>
        <div className="glass-panel border border-white/10 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Claim Center</p>
          <h3 className="text-xl font-semibold text-white">Multi-Agent Routing</h3>
          <p className="mt-2 text-sm text-slate-400">
            Agents can accept, re-assign, or snooze leads. Lead ownership syncs back to Neon user_id for the Engine.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <button className="mae-button primary px-4 py-2 text-xs">
              <CheckCircle className="h-4 w-4" />
              Accept next lead
            </button>
            <button className="mae-button ghost px-4 py-2 text-xs">
              <Clock4 className="h-4 w-4" />
              Snooze
            </button>
            <button className="mae-button ghost px-4 py-2 text-xs">
              <Users className="h-4 w-4" />
              Assign teammate
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-100">
          Unable to load leads. {error.message}
        </div>
      )}

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="glass-panel border border-white/5 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Inbox Radar</p>
              <h2 className="text-2xl font-semibold text-white">Hot & Warm Threads</h2>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200"
            >
              View Inbox <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {inboxPreview.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
                No active conversations yet. Once you ingest a CSV and capture replies, they appear here instantly.
              </div>
            )}

            {inboxPreview.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {lead.contact.firstName} {lead.contact.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{lead.contact.phoneE164}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {lead.property?.addressLine1 ?? "No property"} · {lead.property?.city ?? "-"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <LeadStatusBadge status={lead.status} />
                  <HeatBadge score={lead.sentimentScore} status={lead.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel border border-white/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ops Timeline</p>
                <h3 className="text-xl font-semibold text-white">Neon Footprints</h3>
              </div>
              <button className="text-xs text-slate-400 hover:text-slate-200">Refresh</button>
            </div>

            <div className="mt-5 space-y-5">
              {mockActivity.map((event) => (
                <div key={event.detail} className="border-l-2 border-sky-500/30 pl-4">
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{event.time}</p>
                  <p className="text-sm font-semibold text-white">{event.label}</p>
                  <p className="text-xs text-slate-400">{event.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel border border-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Call Queue</p>
            <h3 className="text-xl font-semibold text-white">Landlines waiting</h3>
            <p className="mt-2 text-sm text-slate-400">
              Leads automatically flow from responsive SMS threads into the call list when they prefer phone.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-3xl font-semibold text-white">{metrics.queue}</p>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Queued</p>
            </div>
            <Link
              href="/dashboard/queue"
              className="mt-4 inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-100"
            >
              Review call queue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="glass-panel border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ingestion Telemetry</p>
            <h2 className="text-2xl font-semibold text-white">Recent Engine Jobs</h2>
            <p className="text-sm text-slate-400">
              Track CSV intake and jump directly into the telemetry panel for deeper logs.
            </p>
          </div>
          <Database className="hidden h-6 w-6 text-sky-300 md:block" />
        </div>
        {jobsError && (
          <p className="mt-4 text-sm text-rose-200">
            Unable to load ingestion jobs. {jobsError.message}
          </p>
        )}
        <div className="mt-5 space-y-4">
          {jobsLoading && (
            <div className="rounded-2xl border border-white/10 p-4 text-sm text-slate-400">
              Fetching ingestion jobs…
            </div>
          )}
          {!jobsLoading && recentJobs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
              No ingestion jobs logged yet. Run `npm run script:import-staged` to seed telemetry.
            </div>
          )}
          {recentJobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-white">{job.fileName}</p>
                <p className="text-xs text-slate-400">
                  {new Date(job.startedAt).toLocaleString()} · {job.rowsProcessed?.toLocaleString() ?? 0} rows
                </p>
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">
                    {job.status}
                  </span>
                  <Link
                    href={`/dashboard/reports?job=${job.id}#job-${job.id}`}
                    className="inline-flex items-center gap-2 text-xs text-sky-300 hover:text-sky-100"
                  >
                    Open job
                    <FileText className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={() => retryJob(job.id)}
                    disabled={retryPending && retryingId === job.id}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-full border border-emerald-400/40 px-4 py-1.5 font-semibold text-emerald-200 transition",
                      retryPending &&
                        retryingId === job.id &&
                        "cursor-not-allowed opacity-70"
                    )}
                  >
                    {retryPending && retryingId === job.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-3.5 w-3.5" />
                    )}
                    Retry
                  </button>
                  <a
                    href={`/api/telemetry/ingestion/${job.id}?download=1`}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 font-semibold text-slate-200 hover:text-white"
                  >
                    Download log
                    <FileText className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel border border-white/10 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Active Inbox</p>
            <h3 className="text-2xl font-semibold text-white">Conversation Table</h3>
            <p className="text-sm text-slate-400">
              Leads with hot, warm, or recently sent responses are prioritized here for fast follow-up.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-100"
          >
            Sync via /api/leads <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left uppercase tracking-[0.3em] text-[10px] text-slate-400">
              <tr>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Heat</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Property</th>
                <th className="px-6 py-3 font-medium">Last Update</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {actionableLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No prioritized leads yet. Import a CSV with the Engine and monitor live replies here.
                  </td>
                </tr>
              )}

              {actionableLeads.map((lead) => (
                <tr key={lead.id} className="bg-white/[0.01]">
                  <td className="px-6 py-4">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td className="px-6 py-4">
                    <HeatBadge score={lead.sentimentScore} status={lead.status} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">
                      {lead.contact.firstName} {lead.contact.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{lead.contact.phoneE164}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    <p>{lead.property?.addressLine1 ?? "Missing address"}</p>
                    <p className="text-xs text-slate-500">
                      {lead.property?.city ?? "N/A"}, {lead.property?.state ?? "--"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {new Date(lead.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/dashboard/chat/${lead.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 px-4 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-400/10"
                      >
                        Reply
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <LeadActionButtons leadId={lead.id} context="inbox" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <PageFooterRail
        kicker="Operations"
        title="Keep inbound + admin flows synchronized"
        description="Use these CTA pills to hop directly into the next best task without losing context."
        actions={[
          { label: "Call Queue", href: "/dashboard/queue", icon: PhoneCall, variant: "primary" },
          { label: "Admin Tower", href: "/dashboard/admin", icon: Shield },
          { label: "Telemetry", href: "/dashboard/reports", icon: Activity },
        ]}
      />
    </div>
  );
}

type MetricCardProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number;
  sub: string;
  accent: string;
};

function MetricCard({ icon: Icon, label, value, sub, accent }: MetricCardProps) {
  return (
    <div className="kpi-card flex flex-col gap-2">
      <div className={accent}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-3xl font-semibold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{sub}</p>
    </div>
  );
}
