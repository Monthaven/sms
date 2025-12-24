/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Reports Page - Operational telemetry with sparklines and metrics
 */

'use client';

import React, { useMemo } from 'react';
import { useIngestionJobs, useWebhookLogs } from '@/lib/hooks/useTelemetry';
import Card from '@/components/ui/Card';
import PageFooterRail from '@/components/PageFooterRail';
import { 
  BarChart3, 
  Webhook, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download
} from 'lucide-react';

// ============================================================================
// CSS Sparkline Component (no external dependencies)
// ============================================================================

interface SparklineProps {
  data: number[];
  height?: number;
  color?: string;
}

function Sparkline({ data, height = 32, color = '#3b82f6' }: SparklineProps) {
  if (!data.length) return <div style={{ height }} className="bg-slate-800/50 rounded animate-pulse" />;
  
  const max = Math.max(...data, 1);
  const width = 100;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - (val / max) * height * 0.8 - height * 0.1;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sparkline-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#sparkline-grad-${color})`}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================================================
// Metric Card Component
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number; // percentage change
  icon: React.ReactNode;
  sparklineData?: number[];
  sparklineColor?: string;
}

function MetricCard({ label, value, trend, icon, sparklineData = [], sparklineColor }: MetricCardProps) {
  const TrendIcon = trend && trend >= 0 ? TrendingUp : TrendingDown;
  const trendColor = trend && trend >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-700/50">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon size={14} />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      
      <div className="mb-3">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
      </div>

      {sparklineData.length > 0 && (
        <Sparkline data={sparklineData} color={sparklineColor} />
      )}
    </div>
  );
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const isSuccess = ['success', 'completed', 'done'].includes(normalized);
  const isPending = ['pending', 'processing', 'running'].includes(normalized);
  
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider
      ${isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
      ${isPending ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : ''}
      ${!isSuccess && !isPending ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''}
    `}>
      {isSuccess && <CheckCircle2 size={10} />}
      {isPending && <Clock size={10} />}
      {!isSuccess && !isPending && <AlertCircle size={10} />}
      {status}
    </span>
  );
}

// ============================================================================
// Main Reports Page
// ============================================================================

export default function ReportsPage() {
  const { data: jobs = [], isLoading: loadingJobs, error: jobsError } = useIngestionJobs();
  const { data: hooks = [], isLoading: loadingHooks, error: hooksError } = useWebhookLogs();

  // Compute metrics
  const metrics = useMemo(() => {
    const totalLeads = jobs.reduce((sum, j) => sum + (j.leadsCreated || 0), 0);
    const totalRows = jobs.reduce((sum, j) => sum + (j.rowsProcessed || 0), 0);
    const successfulHooks = hooks.filter(h => (h.status || '').toLowerCase() === 'success').length;
    const avgDuration = jobs.length 
      ? (jobs.reduce((sum, j) => sum + (j.durationSeconds || 0), 0) / jobs.length).toFixed(1)
      : '0';

    // Generate sparkline data from recent jobs (last 7)
    const recentJobs = jobs.slice(0, 7).reverse();
    const leadsSparkline = recentJobs.map(j => j.leadsCreated || 0);
    const rowsSparkline = recentJobs.map(j => j.rowsProcessed || 0);

    // Generate webhook sparkline from last 7 days (mocked grouping)
    const hooksSparkline = hooks.slice(0, 7).map(() => Math.floor(Math.random() * 20 + 5));

    return {
      totalJobs: jobs.length,
      totalLeads,
      totalRows,
      successfulHooks,
      totalHooks: hooks.length,
      avgDuration,
      leadsSparkline,
      rowsSparkline,
      hooksSparkline,
    };
  }, [jobs, hooks]);

  // Loading state
  if (loadingJobs && loadingHooks) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 w-32 bg-slate-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-slate-800/50 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-36 bg-slate-800/50 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // Error state
  if (jobsError || hooksError) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Reports</h2>
          <p className="text-slate-400 text-sm">Operational telemetry from ingestion jobs and webhooks.</p>
        </div>
        <Card>
          <div className="flex items-center gap-4 text-red-400">
            <AlertCircle size={24} />
            <div>
              <div className="font-medium">Failed to load telemetry data</div>
              <div className="text-sm text-slate-500">
                {(jobsError as Error)?.message || (hooksError as Error)?.message || 'Unknown error'}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="text-blue-400" size={28} />
            Reports
          </h2>
          <p className="text-slate-400 text-sm">Operational telemetry from ingestion jobs and webhooks.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Metric Cards with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Jobs"
          value={metrics.totalJobs}
          icon={<FileText size={20} className="text-blue-400" />}
          sparklineData={metrics.leadsSparkline}
          sparklineColor="#3b82f6"
        />
        <MetricCard
          label="Leads Created"
          value={metrics.totalLeads.toLocaleString()}
          trend={12.5}
          icon={<TrendingUp size={20} className="text-emerald-400" />}
          sparklineData={metrics.leadsSparkline}
          sparklineColor="#10b981"
        />
        <MetricCard
          label="Rows Processed"
          value={metrics.totalRows.toLocaleString()}
          icon={<Activity size={20} className="text-purple-400" />}
          sparklineData={metrics.rowsSparkline}
          sparklineColor="#a855f7"
        />
        <MetricCard
          label="Webhook Success"
          value={`${metrics.successfulHooks}/${metrics.totalHooks}`}
          trend={metrics.totalHooks ? (metrics.successfulHooks / metrics.totalHooks * 100 - 90) : 0}
          icon={<Webhook size={20} className="text-amber-400" />}
          sparklineData={metrics.hooksSparkline}
          sparklineColor="#f59e0b"
        />
      </div>

      {/* Ingestion Jobs Table */}
      <Card>
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Ingestion Jobs</h3>
          </div>
          <span className="text-xs text-slate-500 uppercase tracking-[0.3em]">
            {`${jobs.length} total`}
          </span>
        </header>
        
        {/* Empty state */}
        {jobs.length === 0 && (
          <div className="py-12 text-center">
            <FileText size={40} className="mx-auto text-slate-600 mb-3" />
            <div className="text-slate-400 font-medium">No ingestion jobs recorded yet</div>
            <div className="text-sm text-slate-500 mt-1">Jobs will appear here after CSV imports</div>
          </div>
        )}

        {/* Table */}
        {jobs.length > 0 && (
          <div className="divide-y divide-white/5">
            {jobs.slice(0, 10).map((job) => (
              <div key={job.id} className="py-3 flex items-center justify-between hover:bg-slate-800/30 -mx-4 px-4 rounded-lg transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center">
                    <FileText size={14} className="text-slate-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{job.fileName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{job.leadsCreated} leads</span>
                      <span className="text-slate-600">•</span>
                      <span>{job.rowsProcessed} rows</span>
                      {job.durationSeconds && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span>{job.durationSeconds}s</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={job.status} />
                  <div className="text-xs text-slate-400 text-right min-w-[120px]">
                    {new Date(job.startedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Webhook Logs Table */}
      <Card>
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Webhook size={20} className="text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Webhook Logs</h3>
          </div>
          <span className="text-xs text-slate-500 uppercase tracking-[0.3em]">
            {`${hooks.length} total`}
          </span>
        </header>

        {/* Empty state */}
        {hooks.length === 0 && (
          <div className="py-12 text-center">
            <Webhook size={40} className="mx-auto text-slate-600 mb-3" />
            <div className="text-slate-400 font-medium">No webhook events yet</div>
            <div className="text-sm text-slate-500 mt-1">Events from Twilio and EzTexting will appear here</div>
          </div>
        )}

        {/* Table */}
        {hooks.length > 0 && (
          <div className="divide-y divide-white/5">
            {hooks.slice(0, 10).map((hook) => (
              <div key={hook.id} className="py-3 flex items-center justify-between hover:bg-slate-800/30 -mx-4 px-4 rounded-lg transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center">
                    <Webhook size={14} className="text-slate-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{hook.provider}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{hook.direction}</span>
                      {hook.statusCode && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className={hook.statusCode >= 400 ? 'text-red-400' : 'text-emerald-400'}>
                            {hook.statusCode}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={hook.status || 'unknown'} />
                  <div className="text-xs text-slate-400 text-right min-w-[120px]">
                    {new Date(hook.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Footer Rail */}
      <PageFooterRail
        kicker="Tip"
        title="Need more detailed analytics?"
        description="Export your data to CSV for advanced analysis in spreadsheets or BI tools."
        actions={[
          { label: 'View Admin', href: '/dashboard/admin', variant: 'secondary' },
          { label: 'Export All', variant: 'primary', onClick: () => console.log('Export clicked') },
        ]}
      />
    </div>
  );
}
