/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

'use client';

import React from 'react';
import { useAgents } from '@/lib/hooks/useAgents';
import { GlassTable } from '@/components/ui/GlassTable';
import { UserPlus, Shield, Mail } from 'lucide-react';

export default function AgentsPage() {
  const { data: agents, isLoading } = useAgents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Team Management</h2>
          <p className="text-slate-400 text-sm">Manage access and assignment roles.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all">
          <UserPlus size={16} />
          Invite Agent
        </button>
      </div>

      <GlassTable 
        columns={[
          { header: 'Agent', accessor: 'name', cell: (agent: any) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                {agent.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-white font-medium">{agent.name}</div>
                <div className="text-xs text-slate-500">{agent.email}</div>
              </div>
            </div>
          )},
          { header: 'Role', accessor: 'role', cell: (agent: any) => (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Shield size={14} className="text-blue-400" />
              <span className="capitalize">{agent.role}</span>
            </div>
          )},
          { header: 'Status', accessor: 'status', cell: (agent: any) => (
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
              agent.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              agent.status === 'busy' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-slate-700/30 text-slate-400 border-slate-600/30'
            }`}>
              {agent.status}
            </span>
          )},
          { header: 'Performance', accessor: 'leadsAssigned', cell: (agent: any) => (
             <div className="flex flex-col gap-1 w-24">
                <div className="flex justify-between text-[10px] text-slate-400">
                   <span>Capacity</span>
                   <span>{agent.leadsAssigned}/50</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-blue-500" 
                     style={{ width: `${(agent.leadsAssigned / 50) * 100}%` }} 
                   />
                </div>
             </div>
          )}
        ]}
        data={agents || []}
        actions={(row: any) => (
           <div className="flex gap-2 justify-end">
              <button 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Send email"
                aria-label="Send email"
              >
                 <Mail size={16} />
              </button>
           </div>
        )}
      />
    </div>
  );
}

