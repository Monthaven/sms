/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React from 'react';
import Link from 'next/link';
import { useDashboardStats } from '@/lib/hooks/useDashboardStats';
import { KPICard } from '@/components/dashboard/KPICard';
import { SystemGauge } from '@/components/dashboard/SystemGauge';
import { Phone, DollarSign, Activity, Users, Inbox, MessageSquare, PhoneCall, BarChart3, Settings, GitBranch } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Lead } from '@/lib/api';
import type { AgentPresence } from '@/lib/hooks/useAgents';

// Quick action buttons for dashboard header
const quickActions = [
  { label: "Inbox", href: "/dashboard/inbox", icon: Inbox, color: "blue" },
  { label: "Call Queue", href: "/dashboard/queue", icon: PhoneCall, color: "emerald" },
  { label: "Sequences", href: "/sequences", icon: GitBranch, color: "purple" },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3, color: "amber" },
];

export default function DashboardPage() {
  const { stats, agents, isLoading } = useDashboardStats();

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse">Initializing Command Center...</div>;
  }

  return (
    <div className="space-y-8 fade-in-up">
      
      {/* 1. WELCOME HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold text-white tracking-tight">Welcome back, Agent.</h2>
           <p className="text-slate-400 text-sm mt-1">System status is nominal. <span className="text-emerald-400">{stats.hotLeads} leads</span> require attention.</p>
        </div>
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => {
            const colorStyles: Record<string, string> = {
              blue: "hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400",
              emerald: "hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400",
              purple: "hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-400",
              amber: "hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400",
            };
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/50 bg-slate-800/30 text-slate-300 text-xs font-medium transition-all ${colorStyles[action.color]}`}
              >
                <action.icon size={14} />
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2. KPI METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Leads" 
          value={stats.totalLeads.toLocaleString()} 
          trend={stats.leadGrowth}
          trendUp={Number(stats.leadGrowth) >= 0}
          data={stats.sparkTotal}
          delay={0}
        />
        <KPICard 
          title="Active Calls" 
          value={stats.activeAgents.toString()} 
          icon={<Phone size={18} />}
          trend={`${stats.totalAgents} Agents Online`}
          trendUp={true}
          data={stats.sparkHot}
          delay={100}
        />
        <KPICard 
          title="Conversion Rate" 
          value={stats.hotLeads ? `${Math.min(100, Math.round((stats.hotLeads / Math.max(stats.totalLeads, 1)) * 100))}%` : "0%"} 
          trend={`${stats.hotLeads} Hot`} 
          trendUp={true}
          data={stats.sparkHot}
          delay={200}
        />
        <KPICard 
          title="Revenue" 
          value="$1.2M" 
          icon={<DollarSign size={18} />}
          trend="+8.1%" 
          trendUp={true}
          data={stats.sparkTotal}
          delay={300}
        />
      </div>

      {/* 3. MAIN CONTENT GRID (Activity & Live Queue) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RECENT ACTIVITY (Left - 5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Activity size={16} className="text-blue-400"/> Recent Activity
            </h3>
            <button className="text-[10px] text-slate-400 hover:text-white uppercase tracking-wider">View All</button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
            {stats.recentActivity.length === 0 ? (
               <div className="text-slate-500 text-xs text-center mt-10">No recent activity</div>
            ) : (
               stats.recentActivity.map((lead: Lead, i: number) => (
                <div key={lead.id || i} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50 transition-all cursor-pointer">
                  <div className={`w-2 h-2 rounded-full ${lead.status === 'RESP_HOT' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-slate-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                      {lead.contact?.firstName} {lead.contact?.lastName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {lead.property?.addressLine1 || "No Address"}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                  </div>
                </div>
               ))
            )}
          </div>
        </div>

        {/* LIVE QUEUE (Middle - 4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Users size={16} className="text-emerald-400"/> Live Queue
            </h3>
            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
              {stats.activeAgents} Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
             {agents.map((agent: AgentPresence) => (
               <div key={agent.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                       <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                         {agent.name.substring(0,2).toUpperCase()}
                       </div>
                       <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#0B1120] ${
                         agent.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                       }`} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">{agent.name}</div>
                      <div className="text-[10px] text-slate-400 uppercase">{agent.status}</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    4h 20m
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* SYSTEM STATUS (Right - 3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-6 h-[400px]">
           <div className="flex-1">
              <SystemGauge value={82} />
           </div>
           
           <div className="glass-panel rounded-2xl p-5 flex-1 relative overflow-hidden flex flex-col justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none" />
              <h4 className="text-xs text-slate-400 uppercase tracking-widest mb-3">API Health</h4>
              
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Latency</span>
                  <span className="text-xs font-mono text-emerald-400">24ms</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                   <div className="bg-emerald-500 h-1.5 rounded-full w-[24%] shadow-[0_0_10px_#10b981]"></div>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-slate-300">Success Rate</span>
                  <span className="text-xs font-mono text-blue-400">99.9%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                   <div className="bg-blue-500 h-1.5 rounded-full w-[99%] shadow-[0_0_10px_#3b82f6]"></div>
                </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
