/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

'use client';

import React from 'react';
import { GlassTable } from '@/components/ui/GlassTable';
import { Zap, Clock, MessageSquare, Power } from 'lucide-react';
import { useAutomations } from '@/lib/hooks/useAutomations';

export default function AutomationsPage() {
  const { data: automations = [], isLoading } = useAutomations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Auto-Pilot Workflows</h2>
          <p className="text-slate-400 text-sm">Configure system behaviors and triggers.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all">
          <Zap size={16} />
          New Workflow
        </button>
      </div>

      <GlassTable 
        columns={[
          { header: 'Workflow', accessor: 'name', cell: (row: any) => (
             <div className="font-medium text-white">{row.name}</div>
          )},
          { header: 'Trigger', accessor: 'cadence', cell: (row: any) => (
             <div className="flex items-center gap-2 text-slate-300 text-xs">
                <Clock size={14} className="text-slate-500" />
                {row.cadence}
             </div>
          )},
          { header: 'Owner', accessor: 'owner', cell: (row: any) => (
             <div className="flex items-center gap-2 text-slate-300 text-xs">
                <MessageSquare size={14} className="text-slate-500" />
                {row.owner}
             </div>
          )},
          { header: 'Status', accessor: 'status', cell: (row: any) => (
            <div className={`flex items-center gap-2 text-xs font-bold ${
              row.status === 'healthy' ? 'text-emerald-400' :
              row.status === 'warning' ? 'text-amber-400' : 'text-slate-500'
            }`}>
               <div className={`w-2 h-2 rounded-full ${
                 row.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                 row.status === 'warning' ? 'bg-amber-500' : 'bg-slate-600'
               }`} />
               {row.status?.toUpperCase()}
            </div>
          )}
        ]}
        data={isLoading ? [] : automations}
        actions={(row: any) => (
           <button className={`p-2 rounded transition-colors ${
             row.status === 'healthy'
               ? 'text-emerald-400 hover:bg-emerald-500/10'
               : 'text-slate-500 hover:text-white hover:bg-slate-700'
           }`}>
              <Power size={16} />
           </button>
        )}
      />

      {isLoading && <div className="text-slate-500 text-sm">Loading automations…</div>}
      {!isLoading && automations.length === 0 && (
        <div className="text-slate-500 text-sm">No automations found.</div>
      )}
    </div>
  );
}
