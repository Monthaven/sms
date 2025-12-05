"use client";

import clsx from "clsx";
import PageFooterRail from "@/components/PageFooterRail";
import { useMemo } from "react";
import { useIngestionJobs, useWebhookLogs } from "@/lib/hooks/useTelemetry";
import { useSearchParams } from "next/navigation";
import { Activity, PhoneCall } from "lucide-react";

type TrendPoint = {
  label: string;
  rows: number;
  leads: number;
  duration: number;
};

type WebhookStat = {
  provider: string;
  success: number;
  failed: number;
  total: number;
  lastEvent?: string;
};

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

  const trendData = useMemo<TrendPoint[]>(() => {
    if (!jobs || jobs.length === 0) return [];
    const latest = [...jobs]
      .sort(
        (a, b) =>
          new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
      )
      .slice(-8);
    return latest.map((job) => ({
      label: new Date(job.startedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      rows: job.rowsProcessed ?? 0,
      leads: job.leadsCreated ?? 0,
      duration: job.durationSeconds ?? 0,
    }));
  }, [jobs]);

  const webhookStats = useMemo<WebhookStat[]>(() => {
    if (!webhookLogs || webhookLogs.length === 0) return [];
    const stats = new Map<string, WebhookStat>();
    webhookLogs.forEach((log) => {
      const key = log.provider ?? "Unknown";
      if (!stats.has(key)) {
        stats.set(key, {
          provider: key,
          success: 0,
          failed: 0,
          total: 0,
          lastEvent: log.createdAt,
        });
      }
      const target = stats.get(key)!;
      const isSuccess =
        typeof log.statusCode === "number" ? log.statusCode < 400 : false;
      target.total += 1;
      if (isSuccess) {
        target.success += 1;
      } else {
        target.failed += 1;
      }
      if (
        !target.lastEvent ||
        new Date(log.createdAt).getTime() >
          new Date(target.lastEvent).getTime()
      ) {
        target.lastEvent = log.createdAt;
      }
    });
    return Array.from(stats.values()).sort(
      (a, b) => (b.lastEvent ? new Date(b.lastEvent).getTime() : 0) - (a.lastEvent ? new Date(a.lastEvent).getTime() : 0)
    );
  }, [webhookLogs]);

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

      <section className="grid gap-4 lg:grid-cols-2">
        <TrendCard
          title="Rows processed per job"
          subtitle="Last 8 ingestion runs"
          metric={trendData.at(-1)?.rows}
          trend={trendData}
          dataKey="rows"
          accent="sky"
        />
        <TrendCard
          title="Leads created per job"
          subtitle="Last 8 ingestion runs"
          metric={trendData.at(-1)?.leads}
          trend={trendData}
          dataKey="leads"
          accent="emerald"
        />
      </section>

      <section className="glass-panel border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Webhook Health
            </p>
            <p className="text-sm text-slate-400">
              Success vs failure counts per provider.
            </p>
          </div>
        </div>
        {webhookStats.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">
            No webhook traffic logged yet.
          </p>
        )}
        <div className="mt-6 space-y-4">
          {webhookStats.map((stat) => (
            <WebhookStatRow key={stat.provider} stat={stat} />
          ))}
        </div>
      </section>

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

type TrendCardProps = {
  title: string;
  subtitle: string;
  metric?: number;
  trend: TrendPoint[];
  dataKey: "rows" | "leads" | "duration";
  accent: "sky" | "emerald";
};

function TrendCard({
  title,
  subtitle,
  metric,
  trend,
  dataKey,
  accent,
}: TrendCardProps) {
  return (
    <div className="glass-panel border border-white/10 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {title}
          </p>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <p className="text-2xl font-semibold text-white">
          {metric !== undefined ? metric.toLocaleString() : "--"}
        </p>
      </div>
      <MiniTrendChart data={trend} dataKey={dataKey} accent={accent} />
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        {trend.map((point) => (
          <span key={point.label}>
            {point.label} ·{" "}
            {Number(point[dataKey]).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniTrendChart({
  data,
  dataKey,
  accent,
}: {
  data: TrendPoint[];
  dataKey: "rows" | "leads" | "duration";
  accent: "sky" | "emerald";
}) {
  if (!data || data.length === 0) {
    return (
      <div className="mt-6 h-32 rounded-2xl border border-dashed border-white/10 text-center text-xs text-slate-500">
        <span className="inline-block translate-y-12">
          Waiting for ingestion dataƒ??
        </span>
      </div>
    );
  }
  const values = data.map((point) => Number(point[dataKey]) || 0);
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x =
      data.length === 1 ? 0 : (index / (data.length - 1)) * 100;
    const y = 100 - (value / max) * 100;
    return `${x},${y}`;
  });
  const gradientId = `trend-${accent}`;
  const strokeColor =
    accent === "emerald" ? "rgba(52, 211, 153, 0.9)" : "rgba(56, 189, 248, 0.9)";
  const fillColor =
    accent === "emerald" ? "rgba(52, 211, 153, 0.15)" : "rgba(56, 189, 248, 0.15)";

  return (
    <svg className="mt-6 h-32 w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fillColor} />
          <stop offset="100%" stopColor="rgba(15, 23, 42, 0.05)" />
        </linearGradient>
      </defs>
      {points.length > 1 ? (
        <>
          <polygon
            points={`0,100 ${points.join(" ")} 100,100`}
            fill={`url(#${gradientId})`}
          />
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      ) : (
        <line
          x1="0"
          y1={points[0]?.split(",")[1] ?? 100}
          x2="100"
          y2={points[0]?.split(",")[1] ?? 100}
          stroke={strokeColor}
          strokeWidth="1.8"
        />
      )}
    </svg>
  );
}

function WebhookStatRow({ stat }: { stat: WebhookStat }) {
  const successRatio = stat.total
    ? Math.round((stat.success / stat.total) * 100)
    : 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="font-semibold text-white">{stat.provider}</p>
          <p className="text-xs text-slate-500">
            Last event{" "}
            {stat.lastEvent
              ? new Date(stat.lastEvent).toLocaleString()
              : "N/A"}
          </p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>Success {stat.success.toLocaleString()}</div>
          <div>Failed {stat.failed.toLocaleString()}</div>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-400 transition-[width]"
          style={{ width: `${successRatio}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {successRatio}% success rate across {stat.total.toLocaleString()} events
      </div>
    </div>
  );
}
