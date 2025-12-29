"use client";

/**
 * PROPRIETARY — Always Improving LLC
 * Live Call Dashboard - Real-time manager view
 */

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Pause,
  Users,
  Clock,
  Volume2,
  MessageCircle,
  RefreshCw,
  Headphones,
  MicOff,
  Radio,
  User,
  Coffee,
  CheckCircle,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  isOnline: boolean;
  status: string;
  statusSince: string | null;
  currentCallId: string | null;
  breakReason: string | null;
  callsToday: number;
  messagesToday: number;
}

interface ActiveCall {
  id: string;
  status: string;
  direction: string;
  durationSeconds: number;
  monitoredBy: string | null;
  user: { id: string; name: string } | null;
  contact: { firstName: string | null; lastName: string | null; phone: string } | null;
}

interface DashboardData {
  agents: Agent[];
  activeCalls: ActiveCall[];
  queueStats: {
    incomingQueue: number;
    activeCallCount: number;
    onHoldCount: number;
    monitoredCount: number;
  };
  todayStats: {
    outboundCalls: number;
    inboundCalls: number;
    outboundMessages: number;
    avgCallDuration: number;
    totalTalkTime: number;
  };
  statusBreakdown: {
    online: number;
    onCall: number;
    onBreak: number;
    wrapping: number;
    offline: number;
  };
}

interface LiveCallDashboardProps {
  className?: string;
}

export function LiveCallDashboard({ className }: LiveCallDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
    
    // Refresh every 5 seconds
    refreshInterval.current = setInterval(fetchData, 5000);
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/dashboard/live");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function monitorCall(callId: string, mode: "listen" | "whisper" | "barge") {
    try {
      const res = await fetch("/api/twilio/voice/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, mode }),
      });
      
      if (!res.ok) throw new Error("Monitor failed");
      
      // Could open a call interface or show notification
      alert(`Started ${mode} mode on call`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "ONLINE": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "ON_CALL": return <Phone className="w-4 h-4 text-blue-500" />;
      case "ON_BREAK": return <Coffee className="w-4 h-4 text-yellow-500" />;
      case "WRAPPING": return <Clock className="w-4 h-4 text-purple-500" />;
      default: return <User className="w-4 h-4 text-gray-400" />;
    }
  }

  if (loading) {
    return (
      <div className={cn("animate-pulse space-y-4", className)}>
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <p className="text-red-500">{error || "Failed to load dashboard"}</p>
        <button 
          onClick={fetchData}
          className="mt-2 px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Phone className="w-5 h-5" />}
          label="Active Calls"
          value={data.queueStats.activeCallCount}
          color="green"
        />
        <StatCard
          icon={<PhoneIncoming className="w-5 h-5" />}
          label="In Queue"
          value={data.queueStats.incomingQueue}
          color="yellow"
        />
        <StatCard
          icon={<Pause className="w-5 h-5" />}
          label="On Hold"
          value={data.queueStats.onHoldCount}
          color="red"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Agents Online"
          value={data.statusBreakdown.online + data.statusBreakdown.onCall}
          color="blue"
        />
      </div>

      {/* Active Calls */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-500" />
            Active Calls
          </h3>
          <button 
            onClick={fetchData}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {data.activeCalls.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No active calls
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.activeCalls.map((call) => (
              <div key={call.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {call.direction === "inbound" ? (
                    <PhoneIncoming className="w-5 h-5 text-green-500" />
                  ) : (
                    <PhoneOutgoing className="w-5 h-5 text-blue-500" />
                  )}
                  <div>
                    <div className="font-medium">
                      {call.contact?.firstName} {call.contact?.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      Agent: {call.user?.name || "Unknown"} • {formatDuration(call.durationSeconds)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {call.status === "on_hold" && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      On Hold
                    </span>
                  )}
                  {call.monitoredBy && (
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                      Monitored
                    </span>
                  )}
                  
                  {/* Monitor Actions */}
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => monitorCall(call.id, "listen")}
                      title="Listen (silent)"
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      <Headphones className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => monitorCall(call.id, "whisper")}
                      title="Whisper (coach)"
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      <MicOff className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => monitorCall(call.id, "barge")}
                      title="Barge (join)"
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      <Radio className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent Status Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Agent Status
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {data.agents.map((agent) => (
            <div
              key={agent.id}
              className={cn(
                "p-4 rounded-lg border-2 transition-colors",
                agent.status === "ON_CALL" && "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
                agent.status === "ONLINE" && "border-green-500 bg-green-50 dark:bg-green-900/20",
                agent.status === "ON_BREAK" && "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
                agent.status === "WRAPPING" && "border-purple-500 bg-purple-50 dark:bg-purple-900/20",
                agent.status === "OFFLINE" && "border-gray-300 dark:border-gray-700"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(agent.status)}
                  <span className="font-medium">{agent.name}</span>
                </div>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  agent.status === "ON_CALL" && "bg-blue-500 text-white",
                  agent.status === "ONLINE" && "bg-green-500 text-white",
                  agent.status === "ON_BREAK" && "bg-yellow-500 text-white",
                  agent.status === "WRAPPING" && "bg-purple-500 text-white",
                  agent.status === "OFFLINE" && "bg-gray-500 text-white",
                )}>
                  {agent.status.replace("_", " ")}
                </span>
              </div>

              {agent.breakReason && (
                <p className="text-sm text-gray-500 mb-2">
                  Reason: {agent.breakReason}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {agent.callsToday} calls
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {agent.messagesToday} msgs
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today&apos;s Stats */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          Today&apos;s Activity
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{data.todayStats.outboundCalls}</div>
            <div className="text-xs text-gray-500">Outbound Calls</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{data.todayStats.inboundCalls}</div>
            <div className="text-xs text-gray-500">Inbound Calls</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{data.todayStats.outboundMessages}</div>
            <div className="text-xs text-gray-500">SMS Sent</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{formatDuration(data.todayStats.avgCallDuration)}</div>
            <div className="text-xs text-gray-500">Avg Duration</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{formatDuration(data.todayStats.totalTalkTime)}</div>
            <div className="text-xs text-gray-500">Total Talk Time</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: "green" | "yellow" | "red" | "blue";
}) {
  const colors = {
    green: "bg-green-50 dark:bg-green-900/20 text-green-600",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
  };

  return (
    <div className={cn("p-4 rounded-xl", colors[color])}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
