'use client';

import React, { useMemo } from 'react';
import { TrendingUp, ServerCrash, Activity, Clock3, Plus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useIngestionJobs, useWebhookLogs } from '@/lib/hooks/useTelemetry';
import Card from '@/components/ui/Card';
import Link from 'next/link';

export default function IntelligencePage() {
  const { data: jobs = [], isLoading: loadingJobs } = useIngestionJobs();
  const { data: webhooks = [], isLoading: loadingHooks } = useWebhookLogs();

  const chartData = useMemo(() => {
    return jobs.slice(0, 12).map((job) => ({
      name: job.fileName || job.id.slice(0, 6),
      leads: job.leadsCreated ?? 0,
    })).reverse();
  }, [jobs]);

  const latestWebhook = webhooks[0];
  const failedHooks = webhooks.filter((w) => (w.status || '').toLowerCase() !== 'success').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Intelligence</h2>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile
          label="Ingestion Jobs"
          value={jobs.length.toString()}
          icon={<TrendingUp className="h-4 w-4" />}
          sub={loadingJobs ? 'Loading...' : `${jobs.filter(j => j.status === 'SUCCESS').length} succeeded`}
        />
        <StatTile
          label="Webhook Events"
          value={webhooks.length.toString()}
          icon={<Activity className="h-4 w-4" />}
          sub={loadingHooks ? 'Loading...' : `${failedHooks} issues`}
        />
        <StatTile
          label="Last Webhook"
          value={latestWebhook ? new Date(latestWebhook.createdAt).toLocaleString() : '—'}
          icon={<Clock3 className="h-4 w-4" />}
          sub={latestWebhook ? `${latestWebhook.provider} / ${latestWebhook.status}` : 'Awaiting traffic'}
        />
      </div>

      <Card className="h-[400px]">
        <h3 className="text-slate-400 text-sm font-medium mb-4 flex items-center gap-2">
           <TrendingUp size={16} /> Lead Intake (last jobs)
        </h3>
        <div className="w-full h-full min-h-[250px]">
          <ResponsiveContainer width="100%" height={300} minWidth={300} minHeight={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="leads" stroke="#3B82F6" fillOpacity={1} fill="url(#colorLeads)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="text-slate-400 text-sm font-medium mb-4 flex items-center gap-2">
          <ServerCrash size={16} /> Recent Webhooks
        </h3>
        <div className="space-y-3">
          {loadingHooks && <div className="text-slate-500 text-sm">Loading webhooks…</div>}
          {!loadingHooks && webhooks.length === 0 && (
            <div className="text-slate-500 text-sm">No webhook events yet.</div>
          )}
          {!loadingHooks && webhooks.slice(0, 5).map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
              <div>
                <div className="text-sm text-white font-medium">{w.provider}</div>
                <div className="text-xs text-slate-400">{w.status} • {new Date(w.createdAt).toLocaleString()}</div>
              </div>
              <div className={`text-xs font-bold ${
                (w.status || '').toLowerCase() === 'success' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {w.statusCode ?? ''}
              </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

function StatTile({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-xl font-bold text-white mt-1">{value}</p>
        {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
      </div>
      <div className="text-slate-400">{icon}</div>
    </div>
  );
}
