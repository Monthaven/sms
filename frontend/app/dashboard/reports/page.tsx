"use client";

import clsx from "clsx";
import PageFooterRail from "@/components/PageFooterRail";
import { useMemo } from "react";
import { useIngestionJobs, useWebhookLogs } from "@/lib/hooks/useTelemetry";
import { useSearchParams } from "next/navigation";
import { Activity, PhoneCall } from "lucide-react";

export default function ReportsPage() {
  const {
    data: jobs,
    isLoading: jobsLoading,
    error: jobsError,
  } = useIngestionJobs();
  const {
    data: webhookLogs,
    isLoading: logsLoading,
    error: logsError,
  } = useWebhookLogs();
  const searchParams = useSearchParams();
  const highlightedJob = searchParams.get("job");

  const metrics = useMemo(() => {
    if (!jobs || jobs.length === 0) {
      return [
        { label: "CSV Imported", value: "--" },
        { label: "Rows Processed", value: "--" },
        { label: "Leads Created", value: "--" },
        { label: "Avg Duration", value: "--" },
      ];
    }
    const totalJobs = jobs.length;
    const rows = jobs.reduce((sum, job) => sum + (job.rowsProcessed ?? 0), 0);
    const leads = jobs.reduce((sum, job) => sum + (job.leadsCreated ?? 0), 0);
    const durations = jobs
      .map((job) => job.durationSeconds ?? 0)
      .filter(Boolean);
    const avgDuration =
      durations.length > 0
        ? `${Math.round(
            durations.reduce((sum, val) => sum + val, 0) / durations.length
          )}s`
        : "--";

    return [
      { label: "CSV Imported", value: totalJobs.toString() },
      { label: "Rows Processed", value: rows.toLocaleString() },
      { label: "Leads Created", value: leads.toLocaleString() },
      { label: "Avg Duration", value: avgDuration },
    ];
  }, [jobs]);

  return (
    <div className="space-y-10 text-slate-100">
      <header>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
          Telemetry
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Insights & Ingestion
        </h1>
        <p className="text-sm text-slate-400">
          Monitor CSV ingestion throughput, webhook health, and pipeline
          velocity.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((stat) => (
          <div key={stat.label} className="kpi-card">
            <p className="text-2xl font-semibold text-white">{stat.value}</p>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {stat.label}
            </p>
            <div className="spark-line mt-3" />
          </div>
        ))}
      </div>

      <div className="glass-panel border border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Ingestion Jobs
            </p>
            <p className="text-sm text-slate-400">
              Latest CSV imports from the Engine.
            </p>
          </div>
        </div>
        {jobsError && (
          <p className="px-6 pb-4 text-sm text-rose-200">
            Unable to load jobs: {jobsError.message}
          </p>
        )}
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.3em] text-slate-500">
            <tr>
              <th className="px-6 py-3">Job</th>
              <th className="px-6 py-3">Rows</th>
              <th className="px-6 py-3">Leads</th>
              <th className="px-6 py-3">Duration</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {jobsLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-slate-500">
                  Loading ingestion jobs…
                </td>
              </tr>
            )}
            {!jobsLoading &&
              jobs?.map((job) => {
                const isHighlighted = highlightedJob === job.id;
                return (
                  <tr
                    key={job.id}
                    id={`job-${job.id}`}
                    className={clsx(
                      isHighlighted && "border border-sky-400/40 bg-sky-400/5"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">
                        {job.fileName}
                      </div>
                      <div className="text-xs text-slate-500">
                      {new Date(job.startedAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {job.rowsProcessed?.toLocaleString() ?? "--"}
                  </td>
                  <td className="px-6 py-4">
                    {job.leadsCreated?.toLocaleString() ?? "--"}
                  </td>
                  <td className="px-6 py-4">
                    {job.durationSeconds
                      ? `${job.durationSeconds}s`
                      : "--"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full border border-white/15 px-3 py-1 text-xs capitalize">
                      {job.status.toLowerCase()}
                    </span>
                  </td>
                  </tr>
                );
              })}
            {!jobsLoading && jobs && jobs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-6 text-center text-slate-500"
                >
                  No ingestion jobs logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="glass-panel border border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Webhook Logs
            </p>
            <p className="text-sm text-slate-400">
              Latest EzTexting / Twilio webhook events.
            </p>
          </div>
        </div>
        {logsError && (
          <p className="px-6 pb-4 text-sm text-rose-200">
            Unable to load webhook logs: {logsError.message}
          </p>
        )}
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.3em] text-slate-500">
            <tr>
              <th className="px-6 py-3">Provider</th>
              <th className="px-6 py-3">Direction</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logsLoading && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-slate-500">
                  Loading webhook logs…
                </td>
              </tr>
            )}
            {!logsLoading &&
              webhookLogs?.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4">{log.provider}</td>
                  <td className="px-6 py-4">{log.direction}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full border border-white/15 px-3 py-1 text-xs capitalize">
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            {!logsLoading && webhookLogs && webhookLogs.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-6 text-center text-slate-500"
                >
                  No webhook traffic logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PageFooterRail
        kicker="Telemetry"
        title="Ready to act on ingestion signals?"
        description="Route back into Command or Admin once you understand the ingestion trends."
        actions={[
          { label: "Command", href: "/dashboard", icon: PhoneCall, variant: "primary" },
          { label: "Admin Tower", href: "/dashboard/admin", icon: Activity },
        ]}
      />
    </div>
  );
}
