"use client";

import React from "react";
import { Phone, CheckCircle, Clock } from "lucide-react";
// Go up 3 levels: queue -> dashboard -> app -> frontend
import { THEME } from "../../../lib/theme";
import EmptyState from "../../../components/EmptyState";

export default function QueuePage() {
  // Mock data for now
  const queueItems: any[] = []; 

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Call Queue</h2>
          <p className="text-sm text-gray-500"> prioritizing high-intent leads for immediate outreach.</p>
        </div>
        <div className="flex gap-3">
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${THEME.border} bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider`}>
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
             Dialer Ready
           </div>
        </div>
      </div>

      <div className={`flex-1 rounded-2xl border ${THEME.border} ${THEME.surface} overflow-hidden flex flex-col`}>
        {queueItems.length === 0 ? (
          <EmptyState
            title="Queue Cleared"
            description="There are no pending calls in the high-priority queue. Good job!"
            actionLabel="Refresh List"
            onAction={() => console.log("Refresh")}
          />
        ) : (
          <div className="p-8">
            {/* List would go here */}
            <p className="text-gray-400">Queue items would appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}