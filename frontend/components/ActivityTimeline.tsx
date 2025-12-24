/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Activity Timeline Component
 * Displays a unified timeline of all lead interactions:
 * - Messages (SMS inbound/outbound)
 * - Calls (with recordings, duration, disposition)
 * - Notes
 * - Status changes
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  MessageSquare, 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  StickyNote, 
  RefreshCw,
  Play,
  Clock,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  CheckCircle,
} from "lucide-react";
import clsx from "clsx";

// ============================================================================
// Types
// ============================================================================

type ActivityType = "message" | "call" | "note" | "status_change" | "assignment";

type ActivityItem = {
  id: string;
  type: ActivityType;
  timestamp: string;
  direction?: "INBOUND" | "OUTBOUND";
  body?: string;
  status?: string;
  disposition?: string;
  duration?: number;
  recordingUrl?: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, any>;
};

type ActivitySummary = {
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  totalCalls: number;
  totalChanges: number;
};

type Props = {
  leadId: string;
  className?: string;
  maxHeight?: string;
  showSummary?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
};

// ============================================================================
// Component
// ============================================================================

export default function ActivityTimeline({
  leadId,
  className,
  maxHeight = "500px",
  showSummary = true,
  autoRefresh = false,
  refreshInterval = 30000,
}: Props) {
  const [timeline, setTimeline] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/activity`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      const data = await res.json();
      if (data.success) {
        setTimeline(data.data.timeline);
        setSummary(data.data.summary);
        setError(null);
      } else {
        setError(data.error || "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchActivity();
    
    if (autoRefresh) {
      const interval = setInterval(fetchActivity, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchActivity, autoRefresh, refreshInterval]);

  // Group items by date
  const groupedTimeline = groupByDate(timeline);

  if (loading) {
    return (
      <div className={clsx("glass-panel border border-white/10 p-5", className)}>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 text-sky-400 animate-spin" />
          <span className="ml-2 text-sm text-slate-400">Loading activity...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx("glass-panel border border-white/10 p-5", className)}>
        <div className="text-center py-4 text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className={clsx("glass-panel border border-white/10 p-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-sky-400" />
          <h2 className="text-lg font-semibold text-white">Activity Timeline</h2>
        </div>
        <button
          onClick={fetchActivity}
          className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400 hover:text-white"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Summary Stats */}
      {showSummary && summary && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="rounded-lg bg-white/5 p-2 text-center">
            <div className="text-lg font-bold text-white">{summary.totalMessages}</div>
            <div className="text-[10px] text-slate-500 uppercase">Messages</div>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
            <div className="text-lg font-bold text-emerald-400">{summary.inboundMessages}</div>
            <div className="text-[10px] text-slate-500 uppercase">Inbound</div>
          </div>
          <div className="rounded-lg bg-sky-500/10 p-2 text-center">
            <div className="text-lg font-bold text-sky-400">{summary.outboundMessages}</div>
            <div className="text-[10px] text-slate-500 uppercase">Outbound</div>
          </div>
          <div className="rounded-lg bg-purple-500/10 p-2 text-center">
            <div className="text-lg font-bold text-purple-400">{summary.totalCalls}</div>
            <div className="text-[10px] text-slate-500 uppercase">Calls</div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div 
        className="space-y-4 overflow-y-auto pr-2" 
        style={{ maxHeight }}
      >
        {timeline.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400 text-center">
            No activity recorded yet.
          </div>
        )}

        {groupedTimeline.map((group) => (
          <div key={group.label} className="space-y-3">
            {/* Date Divider */}
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-slate-500">
              <span className="h-px flex-1 bg-white/10" />
              {group.label}
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {/* Activity Items */}
            <div className="space-y-2">
              {group.items.map((item) => (
                <ActivityCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Activity Card Component
// ============================================================================

function ActivityCard({ item }: { item: ActivityItem }) {
  const [showRecording, setShowRecording] = useState(false);

  const config = getActivityConfig(item);

  return (
    <article
      className={clsx(
        "rounded-xl p-3 transition-all",
        config.bgClass,
        config.borderClass
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
        <div className="flex items-center gap-2">
          <config.icon className={clsx("h-3.5 w-3.5", config.iconClass)} />
          <span className="font-medium uppercase tracking-wider">{config.label}</span>
          {item.direction && (
            <span className={clsx(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px]",
              item.direction === "INBOUND" 
                ? "bg-emerald-500/20 text-emerald-300" 
                : "bg-sky-500/20 text-sky-300"
            )}>
              {item.direction === "INBOUND" ? (
                <ArrowDownLeft className="h-2.5 w-2.5" />
              ) : (
                <ArrowUpRight className="h-2.5 w-2.5" />
              )}
              {item.direction === "INBOUND" ? "In" : "Out"}
            </span>
          )}
        </div>
        <span>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Body */}
      {item.body && (
        <p className="text-sm text-white mb-2">{item.body}</p>
      )}

      {/* Call-specific details */}
      {item.type === "call" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          {item.disposition && (
            <span className="px-2 py-0.5 rounded bg-white/5">{item.disposition}</span>
          )}
          {item.duration !== undefined && item.duration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(item.duration)}
            </span>
          )}
          {item.status && (
            <span className={clsx(
              "px-2 py-0.5 rounded",
              getCallStatusColor(item.status)
            )}>
              {item.status}
            </span>
          )}
          {item.recordingUrl && (
            <button
              onClick={() => setShowRecording(!showRecording)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition"
            >
              <Play className="h-3 w-3" />
              Recording
            </button>
          )}
        </div>
      )}

      {/* Recording Player */}
      {showRecording && item.recordingUrl && (
        <div className="mt-2 p-2 rounded-lg bg-black/20">
          <audio controls src={item.recordingUrl} className="w-full h-8" />
        </div>
      )}

      {/* User attribution */}
      {item.userName && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
          <User className="h-3 w-3" />
          {item.userName}
        </div>
      )}
    </article>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getActivityConfig(item: ActivityItem) {
  switch (item.type) {
    case "message":
      return {
        icon: MessageSquare,
        label: item.direction === "INBOUND" ? "Message Received" : "Message Sent",
        iconClass: item.direction === "INBOUND" ? "text-emerald-400" : "text-sky-400",
        bgClass: item.direction === "INBOUND" ? "bg-emerald-500/10" : "bg-sky-500/10",
        borderClass: item.direction === "INBOUND" ? "border border-emerald-500/20" : "border border-sky-500/20",
      };
    case "call":
      return {
        icon: item.direction === "INBOUND" ? PhoneIncoming : PhoneOutgoing,
        label: item.direction === "INBOUND" ? "Incoming Call" : "Outbound Call",
        iconClass: "text-purple-400",
        bgClass: "bg-purple-500/10",
        borderClass: "border border-purple-500/20",
      };
    case "note":
      return {
        icon: StickyNote,
        label: "Note Added",
        iconClass: "text-amber-400",
        bgClass: "bg-amber-500/10",
        borderClass: "border border-amber-500/20",
      };
    case "status_change":
      return {
        icon: CheckCircle,
        label: "Status Changed",
        iconClass: "text-indigo-400",
        bgClass: "bg-indigo-500/10",
        borderClass: "border border-indigo-500/20",
      };
    case "assignment":
      return {
        icon: User,
        label: "Assignment",
        iconClass: "text-teal-400",
        bgClass: "bg-teal-500/10",
        borderClass: "border border-teal-500/20",
      };
    default:
      return {
        icon: FileText,
        label: "Activity",
        iconClass: "text-slate-400",
        bgClass: "bg-white/5",
        borderClass: "border border-white/10",
      };
  }
}

function getCallStatusColor(status: string): string {
  const colors: Record<string, string> = {
    COMPLETED: "bg-green-500/20 text-green-300",
    CONNECTED: "bg-green-500/20 text-green-300",
    RINGING: "bg-blue-500/20 text-blue-300",
    INITIATED: "bg-yellow-500/20 text-yellow-300",
    NO_ANSWER: "bg-orange-500/20 text-orange-300",
    BUSY: "bg-orange-500/20 text-orange-300",
    FAILED: "bg-red-500/20 text-red-300",
    VOICEMAIL: "bg-purple-500/20 text-purple-300",
  };
  return colors[status] || "bg-white/10 text-slate-300";
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function groupByDate(items: ActivityItem[]): { label: string; items: ActivityItem[] }[] {
  const groups: { label: string; items: ActivityItem[] }[] = [];
  
  for (const item of items) {
    const dateLabel = new Date(item.timestamp).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    
    const existing = groups.find((g) => g.label === dateLabel);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ label: dateLabel, items: [item] });
    }
  }
  
  return groups;
}
