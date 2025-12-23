/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import {
  Clock,
  Phone,
  Calendar,
  User,
  MapPin,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

type Callback = {
  id: string;
  callbackAt: string;
  lead: {
    id: string;
    status: string;
    contact: {
      name: string | null;
      phone: string | null;
    } | null;
    property: {
      address: string;
      city: string;
      state: string;
    } | null;
  };
};

export default function CallbacksPage() {
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"today" | "upcoming" | "overdue">("today");

  const fetchCallbacks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sms/callbacks?view=${view}`);
      if (!res.ok) throw new Error("Failed to fetch callbacks");
      const data = await res.json();
      setCallbacks(data.callbacks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load callbacks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCallbacks();
  }, [view]);

  const handleCall = (leadId: string) => {
    window.location.href = `/sms/dial/${leadId}`;
  };

  const formatCallbackTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    }
  };

  const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

  const groupedCallbacks = callbacks.reduce(
    (groups, cb) => {
      const date = new Date(cb.callbackAt).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(cb);
      return groups;
    },
    {} as Record<string, Callback[]>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Clock className="text-amber-400" />
              Scheduled Callbacks
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage your follow-up calls
            </p>
          </div>
          <button
            onClick={fetchCallbacks}
            disabled={isLoading}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200",
              "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw size={14} className={clsx(isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mt-6">
          {(["today", "upcoming", "overdue"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                view === v
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              {v === "today" && "Today"}
              {v === "upcoming" && "Upcoming"}
              {v === "overdue" && "Overdue"}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-panel rounded-xl p-4 border-red-500/30 bg-red-500/10">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && callbacks.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <RefreshCw size={24} className="mx-auto text-slate-500 animate-spin mb-3" />
          <p className="text-sm text-slate-400">Loading callbacks...</p>
        </div>
      ) : callbacks.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <CheckCircle size={32} className="mx-auto text-green-500 mb-3" />
          <p className="text-slate-400">No {view} callbacks scheduled.</p>
          <p className="text-sm text-slate-500 mt-2">
            Callbacks are created when you select &ldquo;Callback Requested&rdquo; in call disposition.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedCallbacks).map(([dateKey, dateCallbacks]) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Calendar size={14} />
                {new Date(dateKey).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <div className="space-y-3">
                {dateCallbacks.map((cb) => (
                  <div
                    key={cb.id}
                    className={clsx(
                      "glass-panel rounded-xl p-5 transition-all duration-200 hover:bg-slate-800/60",
                      isOverdue(cb.callbackAt) && "border-l-4 border-l-red-500"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={clsx(
                              "px-2.5 py-1 text-xs font-semibold rounded-lg",
                              isOverdue(cb.callbackAt)
                                ? "bg-red-500/20 text-red-400"
                                : "bg-amber-500/20 text-amber-400"
                            )}
                          >
                            {formatCallbackTime(cb.callbackAt)}
                          </span>
                          {isOverdue(cb.callbackAt) && (
                            <span className="text-xs text-red-400">OVERDUE</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <User size={14} className="text-slate-500" />
                          <span className="font-medium text-white">
                            {cb.lead.contact?.name || "Unknown Contact"}
                          </span>
                        </div>

                        {cb.lead.property && (
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <MapPin size={14} className="text-slate-500" />
                            <span>
                              {cb.lead.property.address}, {cb.lead.property.city} {cb.lead.property.state}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleCall(cb.lead.id)}
                        className={clsx(
                          "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                          "bg-green-500/10 border border-green-500/30 text-green-400",
                          "hover:bg-green-500/20 hover:border-green-500/50"
                        )}
                      >
                        <Phone size={16} />
                        Call Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
