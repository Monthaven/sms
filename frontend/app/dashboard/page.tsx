"use client";

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
import AgentPresence from "@/components/AgentPresence";

// Mock data to match the visual reference exactly
const RECENT_ACTIVITY = [
  { id: 1, name: "Lead Solitus", action: "Lead interest", time: "3 days ago", status: "Hot" },
  { id: 2, name: "Lead Stadius", action: "Lead interest", time: "3 days ago", status: "Warm" },
  { id: 3, name: "Lead Status", action: "Lead interest", time: "1 day ago", status: "New" },
  { id: 4, name: "Lead Stalius", action: "Lead interest", time: "3 days ago", status: "Hot" },
];

const LIVE_QUEUE = [
  { id: 1, name: "John Caller", status: "Active caller", time: "2m 17s" },
  { id: 2, name: "Renoon Sitiara", status: "Active caller", time: "3h 5m" },
  { id: 3, name: "John Caller", status: "Active caller", time: "18.7m" },
  { id: 4, name: "Mariss Corntmon", status: "Active caller", time: "28.7m" },
];

export default function CommandCenterPage() {
  return (
    <div className="space-y-8">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back, Agent.</h1>
        <p className="text-sm text-slate-400">Here is what is happening in your territory today.</p>
      </div>

      {/* 2. KPI Grid (Matches Image) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Leads"
          value="1,245"
          icon={Users}
          color="bg-slate-800"
          trend="1,245 ↗"
          trendUp={true}
        />
        <StatCard
          label="Active Calls"
          value="18"
          icon={Phone}
          color="bg-slate-800"
          trend="Live"
          trendUp={true}
          variant="default"
        />
        <StatCard
          label="Conversion Rate"
          value="24%"
          icon={TrendingUp}
          color="bg-slate-800"
          trend="+2.4%"
          trendUp={true}
        />
        <StatCard
          label="Revenue"
          value="$1.2M"
          icon={DollarSign}
          color="bg-slate-800"
          trend="On track"
          trendUp={true}
        />
      </div>

      {/* 3. The "Cyberpunk" 3-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Column 1: Recent Activity */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Recent Activity</h3>
            <MoreHorizontal size={16} className="text-slate-500" />
          </div>
          <div className="space-y-4">
            {RECENT_ACTIVITY.map((item) => (
              <div key={item.id} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 border border-slate-700">
                    <Users size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.action} · {item.time}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Live Queue */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Live Queue</h3>
            <MoreHorizontal size={16} className="text-slate-500" />
          </div>
          <div className="space-y-4">
            {LIVE_QUEUE.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <Avatar name={item.name} />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.name}</p>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                      {item.status}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: System Status */}
        <div className="glass-panel p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="font-semibold text-white">System Status</h3>
            <MoreHorizontal size={16} className="text-slate-500" />
          </div>

          <div className="relative z-10 space-y-6">
            {/* The "Gauge" Visual */}
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-full border-4 border-slate-800 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent border-l-transparent rotate-45" />
                <Activity size={24} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">API Status</p>
                <p className="text-xl font-bold text-emerald-400">Operational</p>
              </div>
            </div>

            <div className="h-px bg-white/10" />

            {/* Agent Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Active Agents</p>
                <p className="text-2xl font-bold text-white">12/15</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Avg Response</p>
                <p className="text-2xl font-bold text-white">1.2m</p>
              </div>
            </div>
          </div>

          {/* Decorative Glow for the 3rd panel */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>
      </div>
    </div>
  );
}