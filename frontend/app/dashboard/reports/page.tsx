/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

'use client';

import React from 'react';
import { useIngestionJobs, useWebhookLogs } from '@/lib/hooks/useTelemetry';
import Card from '@/components/ui/Card';

export default function ReportsPage() {
  const { data: jobs = [], isLoading: loadingJobs } = useIngestionJobs();
  const { data: hooks = [], isLoading: loadingHooks } = useWebhookLogs();

  return (
    <div className="space-y-8 text-slate-100">
      <div>
        <h2 className="text-2xl font-bold text-white">Reports</h2>
        <p className="text-slate-400 text-sm">Operational telemetry from ingestion jobs and webhooks.</p>
      </div>

      <Card>
        <header className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Ingestion Jobs</h3>
          <span className="text-xs text-slate-500 uppercase tracking-[0.3em]">
            {loadingJobs ? 'Loading…' : `${jobs.length} total`}
          </span>
        </header>
        <div className="divide-y divide-white/5">
          {loadingJobs && <div className="py-3 text-slate-500 text-sm">Loading ingestion jobs…</div>}
          {!loadingJobs && jobs.length === 0 && (
            <div className="py-3 text-slate-500 text-sm">No ingestion jobs recorded yet.</div>
          )}
          {!loadingJobs &&
            jobs.slice(0, 10).map((job) => (
              <div key={job.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{job.fileName}</div>
                  <div className="text-xs text-slate-500">
                    {job.status} • {job.leadsCreated} leads • {job.rowsProcessed} rows
                  </div>
                </div>
                <div className="text-xs text-slate-400 text-right">
                  {new Date(job.startedAt).toLocaleString()}
                  {job.durationSeconds ? ` • ${job.durationSeconds}s` : ''}
                </div>
              </div>
            ))}
        </div>
      </Card>

      <Card>
        <header className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Webhook Logs</h3>
          <span className="text-xs text-slate-500 uppercase tracking-[0.3em]">
            {loadingHooks ? 'Loading…' : `${hooks.length} total`}
          </span>
        </header>
        <div className="divide-y divide-white/5">
          {loadingHooks && <div className="py-3 text-slate-500 text-sm">Loading webhook logs…</div>}
          {!loadingHooks && hooks.length === 0 && (
            <div className="py-3 text-slate-500 text-sm">No webhook events yet.</div>
          )}
          {!loadingHooks &&
            hooks.slice(0, 10).map((hook) => (
              <div key={hook.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{hook.provider}</div>
                  <div className="text-xs text-slate-500">
                    {hook.status} • {hook.statusCode ?? ''} • {hook.direction}
                  </div>
                </div>
                <div className={`text-xs font-bold ${
                  (hook.status || '').toLowerCase() === 'success' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {new Date(hook.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
