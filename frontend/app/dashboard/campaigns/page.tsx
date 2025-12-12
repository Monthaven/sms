'use client';

import React from 'react';
import { GlassTable } from '@/components/ui/GlassTable';
import { Play, Pause, Plus, BarChart3, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCampaigns } from '@/lib/hooks/useCampaigns';

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading } = useCampaigns();

  const activeCount = campaigns.filter((c) => c.status?.toUpperCase() === 'ACTIVE' || c.status?.toUpperCase() === 'RUNNING').length;
  const channelCount = (() => {
    const seen: Record<string, boolean> = {};
    campaigns.forEach((c) => {
      const key = c.channel || '';
      if (key) seen[key] = true;
    });
    return Object.keys(seen).length;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Campaigns</h2>
          <p className="text-slate-400 text-sm">Manage outbound SMS & Email automation.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Campaigns', val: activeCount.toString(), color: 'text-blue-400' },
          { label: 'Messages (total)', val: campaigns.reduce((acc, c) => acc + (c.messages || 0), 0).toString(), color: 'text-emerald-400' },
          { label: 'Channels', val: channelCount.toString(), color: 'text-purple-400' }
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-4 rounded-xl flex items-center justify-between">
            <span className="text-slate-400 text-xs uppercase tracking-wider">{stat.label}</span>
            <span className={`text-2xl font-bold ${stat.color} font-mono`}>{stat.val}</span>
          </div>
        ))}
      </div>

      {/* Campaigns Table */}
      <GlassTable 
        columns={[
          { header: 'Campaign Name', accessor: 'name', className: 'w-1/3', cell: (row: any) => (
            <div>
              <div className="font-medium text-white">{row.name}</div>
              <div className="text-xs text-slate-500">{row.channel || 'Engine'}</div>
            </div>
          )},
          { header: 'Status', accessor: 'status', cell: (row: any) => (
            <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${
              row.status?.toUpperCase() === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' :
              row.status?.toUpperCase() === 'DRAFT' ? 'bg-slate-700/30 text-slate-400 border-slate-600' :
              'bg-slate-700/30 text-slate-400 border-slate-600'
            }`}>
              {row.status || 'Unknown'}
            </span>
          )},
          { header: 'Progress', accessor: 'progress', className: 'w-1/4', cell: (row: any) => (
            <div className="w-full">
              <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                <span>{row.messages ?? 0} Sent</span>
                <span>{row.progress ?? 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${row.progress ?? 0}%` }}
                />
              </div>
            </div>
          )},
          { header: 'Engagement', accessor: 'replies', cell: (row: any) => (
             <div className="flex items-center gap-1.5 text-slate-300">
                <MessageSquare size={14} className="text-slate-500" />
                {row.replies ?? 0}
             </div>
          )},
          { header: 'Last Updated', accessor: 'updated', cell: (row: any) => (
            <span className="text-xs text-slate-500 font-mono">
              {row.lastActivity ? formatDistanceToNow(new Date(row.lastActivity), { addSuffix: true }) : '—'}
            </span>
          )}
        ]}
        data={isLoading ? [] : campaigns}
        actions={(row: any) => (
          <div className="flex justify-end gap-2">
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">
              <BarChart3 size={16} />
            </button>
            <button className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors">
              {row.status?.toUpperCase() === 'ACTIVE' ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </div>
        )}
      />

      {isLoading && (
        <div className="text-slate-500 text-sm">Loading campaigns…</div>
      )}
      {!isLoading && campaigns.length === 0 && (
        <div className="text-slate-500 text-sm">No campaigns found yet.</div>
      )}
    </div>
  );
}
