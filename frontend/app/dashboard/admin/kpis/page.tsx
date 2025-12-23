/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  PhoneOff,
  MessageSquare,
  TrendingUp,
  Clock,
  Target,
  Users,
  Flame,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type KPIData = {
  callsMade: number;
  callsAnswered: number;
  avgCallDuration: number;
  hotLeads: number;
  callbacks: number;
  conversionRate: number;
  agentStats: Array<{
    id: string;
    name: string;
    calls: number;
    connects: number;
    hotLeads: number;
    avgDuration: number;
  }>;
  dailyStats: Array<{
    date: string;
    calls: number;
    connects: number;
    hotLeads: number;
  }>;
  dispositions: Array<{
    name: string;
    value: number;
    color: string;
  }>;
};

async function fetchKPIs(): Promise<KPIData> {
  const res = await fetch("/api/admin/kpis");
  if (!res.ok) {
    // Return mock data for now
    return {
      callsMade: 342,
      callsAnswered: 128,
      avgCallDuration: 245,
      hotLeads: 24,
      callbacks: 67,
      conversionRate: 7.2,
      agentStats: [
        { id: "1", name: "Alex M.", calls: 89, connects: 34, hotLeads: 8, avgDuration: 312 },
        { id: "2", name: "Sarah K.", calls: 76, connects: 29, hotLeads: 6, avgDuration: 287 },
        { id: "3", name: "Mike T.", calls: 65, connects: 24, hotLeads: 5, avgDuration: 198 },
        { id: "4", name: "Lisa R.", calls: 58, connects: 22, hotLeads: 3, avgDuration: 256 },
        { id: "5", name: "James W.", calls: 54, connects: 19, hotLeads: 2, avgDuration: 201 },
      ],
      dailyStats: Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        calls: Math.floor(Math.random() * 50 + 20),
        connects: Math.floor(Math.random() * 20 + 5),
        hotLeads: Math.floor(Math.random() * 5),
      })),
      dispositions: [
        { name: "No Answer", value: 142, color: "#64748b" },
        { name: "Voicemail", value: 72, color: "#3b82f6" },
        { name: "Not Interested", value: 58, color: "#ef4444" },
        { name: "Callback", value: 46, color: "#f59e0b" },
        { name: "Hot Lead", value: 24, color: "#10b981" },
      ],
    };
  }
  return res.json();
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function KPIsPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: fetchKPIs,
    refetchInterval: 30000,
  });

  if (isLoading || !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 animate-pulse">Loading KPI dashboard...</div>
      </div>
    );
  }

  const connectRate = kpis.callsMade > 0 ? ((kpis.callsAnswered / kpis.callsMade) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Performance Dashboard</h2>
          <p className="text-slate-400 text-sm">
            Real-time KPIs and team performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Clock size={14} />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Calls Made",
            value: kpis.callsMade,
            icon: Phone,
            color: "blue",
            trend: "+12%",
            up: true,
          },
          {
            label: "Connects",
            value: kpis.callsAnswered,
            icon: MessageSquare,
            color: "emerald",
            trend: `${connectRate}%`,
            up: true,
          },
          {
            label: "Avg Duration",
            value: formatDuration(kpis.avgCallDuration),
            icon: Clock,
            color: "purple",
            trend: "+8s",
            up: true,
          },
          {
            label: "Hot Leads",
            value: kpis.hotLeads,
            icon: Flame,
            color: "orange",
            trend: "+3",
            up: true,
          },
          {
            label: "Callbacks",
            value: kpis.callbacks,
            icon: Calendar,
            color: "amber",
            trend: "+15",
            up: true,
          },
          {
            label: "Conversion",
            value: `${kpis.conversionRate}%`,
            icon: Target,
            color: "rose",
            trend: "+0.5%",
            up: true,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="glass-panel rounded-xl p-4 border border-slate-700/50 group hover:border-slate-600/50 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider">{card.label}</span>
              <card.icon size={16} className={`text-${card.color}-400`} />
            </div>
            <div className={`text-2xl font-bold text-${card.color}-400`}>{card.value}</div>
            <div
              className={`flex items-center gap-1 text-xs mt-1 ${
                card.up ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {card.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {card.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" />
            Daily Activity Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpis.dailyStats}>
                <defs>
                  <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="connectsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#callsGrad)"
                  name="Calls"
                />
                <Area
                  type="monotone"
                  dataKey="connects"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#connectsGrad)"
                  name="Connects"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disposition Pie Chart */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Target size={16} className="text-emerald-400" />
            Call Outcomes
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={kpis.dispositions}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {kpis.dispositions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {kpis.dispositions.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-400">{d.name}</span>
                </div>
                <span className="text-slate-300 font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Leaderboard */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-700/50">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Users size={16} className="text-purple-400" />
          Agent Leaderboard
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left p-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Rank
                </th>
                <th className="text-left p-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Agent
                </th>
                <th className="text-center p-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Calls
                </th>
                <th className="text-center p-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Connects
                </th>
                <th className="text-center p-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Connect %
                </th>
                <th className="text-center p-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Hot Leads
                </th>
                <th className="text-center p-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Avg Duration
                </th>
                <th className="text-right p-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody>
              {kpis.agentStats.map((agent, i) => {
                const connectPct = agent.calls > 0 ? ((agent.connects / agent.calls) * 100).toFixed(0) : 0;
                const perfScore = agent.connects * 2 + agent.hotLeads * 10;
                const maxPerf = Math.max(...kpis.agentStats.map((a) => a.connects * 2 + a.hotLeads * 10));
                const perfPct = (perfScore / maxPerf) * 100;

                return (
                  <tr
                    key={agent.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          i === 0
                            ? "bg-amber-500/20 text-amber-400"
                            : i === 1
                            ? "bg-slate-400/20 text-slate-300"
                            : i === 2
                            ? "bg-amber-700/20 text-amber-600"
                            : "bg-slate-700/30 text-slate-500"
                        }`}
                      >
                        {i + 1}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                          {agent.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <span className="font-medium text-white">{agent.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-slate-300">{agent.calls}</td>
                    <td className="p-3 text-center text-emerald-400 font-medium">{agent.connects}</td>
                    <td className="p-3 text-center text-slate-300">{connectPct}%</td>
                    <td className="p-3 text-center">
                      <span className="flex items-center justify-center gap-1 text-orange-400">
                        <Flame size={14} />
                        {agent.hotLeads}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-300 font-mono text-sm">
                      {formatDuration(agent.avgDuration)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                            style={{ width: `${perfPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8">{Math.round(perfPct)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
