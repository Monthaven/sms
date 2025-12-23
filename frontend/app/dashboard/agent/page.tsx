/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Phone,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Award,
  Target,
  Flame,
  PhoneCall,
  PhoneMissed,
  Voicemail,
  RefreshCw,
} from "lucide-react";

type AgentStats = {
  callsToday: number;
  callsThisWeek: number;
  callsThisMonth: number;
  avgCallDuration: number;
  hotLeads: number;
  callbacksScheduled: number;
  conversionRate: number;
  rank: number;
  totalAgents: number;
  outcomeBreakdown: { name: string; value: number; color: string }[];
  dailyActivity: { day: string; calls: number }[];
  recentCalls: {
    id: string;
    contactName: string;
    outcome: string;
    duration: number;
    createdAt: string;
  }[];
};

const outcomeColors: Record<string, string> = {
  HOT_LEAD: "#f97316",
  CALLBACK_REQUESTED: "#eab308",
  LEFT_VOICEMAIL: "#3b82f6",
  NO_ANSWER: "#64748b",
  NOT_INTERESTED: "#ef4444",
  WRONG_NUMBER: "#6b7280",
};

const outcomeIcons: Record<string, typeof Phone> = {
  HOT_LEAD: Flame,
  CALLBACK_REQUESTED: Calendar,
  LEFT_VOICEMAIL: Voicemail,
  NO_ANSWER: PhoneMissed,
  NOT_INTERESTED: PhoneCall,
  WRONG_NUMBER: PhoneMissed,
};

export default function AgentDashboard() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/stats?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw size={32} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Performance</h1>
            <p className="text-sm text-slate-400 mt-1">
              Track your calls and conversion metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800/50 rounded-lg p-1">
              {(["today", "week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={clsx(
                    "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    period === p
                      ? "bg-blue-500 text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={fetchStats}
              disabled={isLoading}
              className={clsx(
                "p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors",
                isLoading && "opacity-50"
              )}
              title="Refresh statistics"
              aria-label="Refresh statistics"
            >
              <RefreshCw size={16} className={clsx(isLoading && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-panel rounded-xl p-4 border-red-500/30 bg-red-500/10">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {stats && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Phone size={20} className="text-blue-400" />
                </div>
                <span className="text-sm text-slate-400">Calls Made</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {period === "today"
                  ? stats.callsToday
                  : period === "week"
                  ? stats.callsThisWeek
                  : stats.callsThisMonth}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Clock size={20} className="text-amber-400" />
                </div>
                <span className="text-sm text-slate-400">Avg Duration</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {formatDuration(stats.avgCallDuration)}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Flame size={20} className="text-orange-400" />
                </div>
                <span className="text-sm text-slate-400">Hot Leads</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats.hotLeads}</div>
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp size={20} className="text-green-400" />
                </div>
                <span className="text-sm text-slate-400">Conversion</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {stats.conversionRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Daily Activity Chart */}
            <div className="glass-panel rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Daily Activity</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Outcome Breakdown */}
            <div className="glass-panel rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Outcome Breakdown</h3>
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.outcomeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {stats.outcomeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {stats.outcomeBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-slate-400 flex-1">
                        {item.name.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-white font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Rank Card */}
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <Award size={32} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Team Ranking</h3>
                  <p className="text-sm text-slate-400">Based on hot leads generated</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-white">
                  #{stats.rank}
                  <span className="text-lg text-slate-500">/{stats.totalAgents}</span>
                </div>
                <p className="text-sm text-slate-400">
                  {stats.callbacksScheduled} callbacks scheduled
                </p>
              </div>
            </div>
          </div>

          {/* Recent Calls */}
          <div className="glass-panel rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Calls</h3>
            <div className="space-y-3">
              {stats.recentCalls.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  No calls recorded yet
                </p>
              ) : (
                stats.recentCalls.map((call) => {
                  const OutcomeIcon = outcomeIcons[call.outcome] || Phone;
                  return (
                    <div
                      key={call.id}
                      className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${outcomeColors[call.outcome] || "#64748b"}20`,
                        }}
                      >
                        <OutcomeIcon
                          size={20}
                          style={{ color: outcomeColors[call.outcome] || "#64748b" }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{call.contactName}</p>
                        <p className="text-sm text-slate-400">
                          {call.outcome.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">{formatDuration(call.duration)}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(call.createdAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
