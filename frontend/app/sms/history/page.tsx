/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useState, useEffect } from "react";
import {
  PhoneIcon,
  ChatBubbleLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

interface HistoryItem {
  id: string;
  type: "call" | "sms";
  direction: "inbound" | "outbound";
  contactName: string;
  contactPhone: string;
  status: string;
  duration?: number;
  message?: string;
  timestamp: string;
  recordingUrl?: string;
}

type FilterType = "all" | "calls" | "sms";
type FilterDirection = "all" | "inbound" | "outbound";

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterDirection, setFilterDirection] = useState<FilterDirection>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      // Fetch from both calls and messages
      const [callsRes, messagesRes] = await Promise.all([
        fetch("/api/sms/calls?limit=50"),
        fetch("/api/sms/messages?limit=50"),
      ]);

      const callsData = callsRes.ok ? await callsRes.json() : { calls: [] };
      const messagesData = messagesRes.ok ? await messagesRes.json() : { messages: [] };

      // Transform calls to history items
      const callItems: HistoryItem[] = (callsData.calls || []).map((call: any) => ({
        id: call.id,
        type: "call" as const,
        direction: call.direction?.toLowerCase() || "outbound",
        contactName: call.contact?.firstName
          ? `${call.contact.firstName} ${call.contact.lastName || ""}`.trim()
          : "Unknown",
        contactPhone: call.contact?.phone || call.toNumber || "Unknown",
        status: call.status || "completed",
        duration: call.duration,
        timestamp: call.createdAt,
        recordingUrl: call.recordingUrl,
      }));

      // Transform messages to history items
      const messageItems: HistoryItem[] = (messagesData.messages || []).map((msg: any) => ({
        id: msg.id,
        type: "sms" as const,
        direction: msg.direction?.toLowerCase() || "outbound",
        contactName: msg.contact?.firstName
          ? `${msg.contact.firstName} ${msg.contact.lastName || ""}`.trim()
          : "Unknown",
        contactPhone: msg.contact?.phone || msg.toNumber || "Unknown",
        status: msg.status || "delivered",
        message: msg.body,
        timestamp: msg.createdAt,
      }));

      // Combine and sort by timestamp
      const combined = [...callItems, ...messageItems].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setHistory(combined);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredHistory = history.filter((item) => {
    // Type filter
    if (filterType !== "all" && item.type !== filterType.slice(0, -1)) {
      if (filterType === "calls" && item.type !== "call") return false;
      if (filterType === "sms" && item.type !== "sms") return false;
    }

    // Direction filter
    if (filterDirection !== "all" && item.direction !== filterDirection) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.contactName.toLowerCase().includes(query) ||
        item.contactPhone.includes(query) ||
        item.message?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  function formatDuration(seconds?: number): string {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Activity History</h1>
        <p className="text-zinc-400 mt-1">View your call and SMS history</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, phone, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-zinc-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="calls">Calls Only</option>
            <option value="sms">SMS Only</option>
          </select>
        </div>

        {/* Direction filter */}
        <select
          value={filterDirection}
          onChange={(e) => setFilterDirection(e.target.value as FilterDirection)}
          className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-4">
          <p className="text-sm text-zinc-400">Total Calls</p>
          <p className="text-2xl font-bold text-white">
            {history.filter((h) => h.type === "call").length}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-4">
          <p className="text-sm text-zinc-400">Total SMS</p>
          <p className="text-2xl font-bold text-white">
            {history.filter((h) => h.type === "sms").length}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-4">
          <p className="text-sm text-zinc-400">Outbound</p>
          <p className="text-2xl font-bold text-green-400">
            {history.filter((h) => h.direction === "outbound").length}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-4">
          <p className="text-sm text-zinc-400">Inbound</p>
          <p className="text-2xl font-bold text-blue-400">
            {history.filter((h) => h.direction === "inbound").length}
          </p>
        </div>
      </div>

      {/* History list */}
      <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            {searchQuery || filterType !== "all" || filterDirection !== "all"
              ? "No matching history found"
              : "No activity history yet"}
          </div>
        ) : (
          <div className="divide-y divide-zinc-700">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 hover:bg-zinc-700/30 transition-colors"
              >
                {/* Icon */}
                <div
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    item.type === "call" ? "bg-green-500/20" : "bg-blue-500/20"
                  )}
                >
                  {item.type === "call" ? (
                    <PhoneIcon
                      className={clsx(
                        "h-5 w-5",
                        item.direction === "inbound" ? "text-blue-400" : "text-green-400"
                      )}
                    />
                  ) : (
                    <ChatBubbleLeftIcon
                      className={clsx(
                        "h-5 w-5",
                        item.direction === "inbound" ? "text-blue-400" : "text-green-400"
                      )}
                    />
                  )}
                </div>

                {/* Direction indicator */}
                <div className="flex-shrink-0">
                  {item.direction === "inbound" ? (
                    <ArrowDownIcon className="h-4 w-4 text-blue-400" />
                  ) : (
                    <ArrowUpIcon className="h-4 w-4 text-green-400" />
                  )}
                </div>

                {/* Contact info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{item.contactName}</p>
                  <p className="text-sm text-zinc-400">{item.contactPhone}</p>
                  {item.message && (
                    <p className="text-sm text-zinc-500 truncate mt-1">{item.message}</p>
                  )}
                </div>

                {/* Status & duration */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-zinc-400">{formatTimestamp(item.timestamp)}</p>
                  {item.type === "call" && (
                    <p className="text-sm text-zinc-500">{formatDuration(item.duration)}</p>
                  )}
                  <span
                    className={clsx(
                      "inline-block mt-1 px-2 py-0.5 rounded text-xs",
                      item.status === "completed" || item.status === "delivered"
                        ? "bg-green-500/20 text-green-400"
                        : item.status === "missed" || item.status === "failed"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-zinc-700 text-zinc-400"
                    )}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Recording playback */}
                {item.recordingUrl && (
                  <button
                    onClick={() => window.open(item.recordingUrl, "_blank")}
                    className="flex-shrink-0 p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-colors"
                    title="Play recording"
                  >
                    <PlayIcon className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
