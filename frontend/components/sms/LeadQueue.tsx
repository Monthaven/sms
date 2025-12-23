/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

 "use client";

import { useState, useCallback } from "react";
import clsx from "clsx";
import { LeadCard } from "./LeadCard";
import { useLeadQueue } from "@/hooks/useLeadQueue";
import { RefreshCw, Filter, SortAsc } from "lucide-react";

export function LeadQueue() {
  const [priority, setPriority] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [sort, setSort] = useState<"score" | "callback" | "recent">("score");
  const { leads, total, isLoading, error, refresh } = useLeadQueue(priority, sort);
  const currentUserId: string | undefined = undefined; // no auth provider yet; caller masking handled server-side

  const handleClaim = useCallback(
    async (id: string) => {
      await fetch(`/api/sms/leads/${id}/claim`, { method: "POST" });
      refresh();
    },
    [refresh]
  );

  const handleCall = useCallback((id: string) => {
    window.location.href = `/sms/dial/${id}`;
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Lead Queue</h1>
            <p className="text-sm text-slate-400 mt-1">
              Showing {leads.length} of {total} leads
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-500" />
              <select
                title="Filter by priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              >
                {["ALL", "HIGH", "MEDIUM", "LOW"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "ALL" ? "All Priorities" : `${opt} Priority`}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-2">
              <SortAsc size={14} className="text-slate-500" />
              <select
                title="Sort order"
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              >
                <option value="score">By Score</option>
                <option value="callback">By Callback</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              title="Refresh queue"
              onClick={() => refresh()}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200",
                "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={clsx(isLoading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="glass-panel rounded-xl p-4 border-red-500/30 bg-red-500/10">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && leads.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <RefreshCw size={24} className="mx-auto text-slate-500 animate-spin mb-3" />
          <p className="text-sm text-slate-400">Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <p className="text-slate-400">No leads available in the queue.</p>
          <button
            onClick={() => refresh()}
            className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all duration-200"
          >
            Check Again
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {leads.map((item) => (
            <LeadCard
              key={item.lead.id}
              lead={item.lead}
              contact={item.contact}
              property={item.property}
              masked
              currentUserId={currentUserId}
              onClaim={() => handleClaim(item.lead.id)}
              onCall={() => handleCall(item.lead.id)}
              disabled={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
