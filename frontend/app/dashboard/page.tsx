import React from "react";
import {
  Users,
  Phone,
  TrendingUp,
  DollarSign,
  Activity,
  MoreHorizontal,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Avatar, StatusBadge } from "@/components/Shared";
import { getDashboardStats } from "@/app/actions";
import { formatDistanceToNow } from "date-fns";

// Make the component async to fetch data on the server
export default async function CommandCenterPage() {
  const data = await getDashboardStats();

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back, Agent.</h1>
        <p className="text-sm text-slate-400">System status: <span className="text-emerald-400 font-mono">ONLINE</span></p>
      </div>

      {/* 2. Live KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={data.kpi.total.toLocaleString()}
          iconName="Users"
          color="indigo" // Blue Glow
          trend="Database"
          trendUp={true}
        />
        <StatCard
          label="Hot Leads"
          value={data.kpi.hot}
          iconName="Phone"
          color="rose" // Red Glow (Urgent)
          trend="Action Req."
          trendUp={true}
          variant="status"
        />
        <StatCard
          label="Conversion"
          value={data.kpi.conversion}
          iconName="TrendingUp"
          color="emerald" // Green Glow (Success)
          trend="+2.4%"
          trendUp={true}
        />
        <StatCard
          label="Est. Revenue"
          value={data.kpi.revenue}
          iconName="DollarSign"
          color="amber" // Gold Glow (Money)
          trend="Pipeline"
          trendUp={true}
        />
      </div>

      {/* 3. The 3-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity Feed */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Recent Activity</h3>
            <MoreHorizontal size={16} className="text-slate-500" />
          </div>
          <div className="space-y-4">
            {data.activity.length === 0 && <p className="text-xs text-slate-500">No recent activity.</p>}
            {data.activity.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 border border-slate-700 group-hover:border-indigo-500/50 transition-colors">
                    <Users size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.action} · {formatDistanceToNow(item.time)} ago</p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Live Call Queue */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Call Queue</h3>
            <div className="flex items-center gap-2">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
            </div>
          </div>
          <div className="space-y-4">
            {data.queue.length === 0 && <p className="text-xs text-slate-500">Queue is clear.</p>}
            {data.queue.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Avatar name={item.name} />
                  <div>
                    <p className="text-sm font-medium text-slate-200 group-hover:text-white">{item.name}</p>
                    <p className="text-[10px] text-slate-400">
                      Waiting {formatDistanceToNow(item.time)}
                    </p>
                  </div>
                </div>
                <Phone size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* System Status (Visual Only) */}
        <div className="glass-panel p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="font-semibold text-white">System Health</h3>
            <MoreHorizontal size={16} className="text-slate-500" />
          </div>
          
          <div className="relative z-10 space-y-6">
            {/* The Gauge */}
            <div className="flex items-center gap-4">
               <div className="relative h-20 w-20 rounded-full border-4 border-slate-800 flex items-center justify-center">
                 <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent border-l-transparent rotate-[45deg]" />
                 <Activity size={24} className="text-indigo-400" />
               </div>
               <div>
                 <p className="text-xs uppercase tracking-widest text-slate-500">Engine</p>
                 <p className="text-xl font-bold text-emerald-400">100%</p>
               </div>
            </div>

            <div className="h-px bg-white/10" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Latency</p>
                <p className="text-2xl font-bold text-white">24ms</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Error Rate</p>
                <p className="text-2xl font-bold text-white">0.0%</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

      </div>
    </div>
  );
}