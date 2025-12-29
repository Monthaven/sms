/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Flame, MessageCircle, Phone, Bell, Check, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRealtime, type RealtimeEvent } from "./RealtimeProvider";

type Notification = {
  id: string;
  type: "hot_lead" | "new_response" | "call_missed" | "lead_assigned" | "system";
  title: string;
  body?: string;
  leadId?: string;
  createdAt: string | Date;
  read?: boolean;
};

export default function NotificationsPanel() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Try to use realtime context - may not exist if not wrapped in provider
  let realtimeContext: ReturnType<typeof useRealtime> | null = null;
  try {
    realtimeContext = useRealtime();
  } catch {
    // Not in a RealtimeProvider context, that's okay
  }

  // Handle real-time events
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    if (!event.data) return;

    let newNotification: Notification | null = null;

    switch (event.type) {
      case 'new_message':
      case 'newMessage':
        newNotification = {
          id: `rt-${Date.now()}`,
          type: 'new_response',
          title: event.data.contactName || 'New Message',
          body: (event.data.body || event.data.message || '').slice(0, 100),
          leadId: event.data.leadId as string,
          createdAt: new Date(),
          read: false,
        };
        break;
      case 'lead_hot':
        newNotification = {
          id: `rt-${Date.now()}`,
          type: 'hot_lead',
          title: event.data.contactName || 'Hot Lead',
          body: event.data.message as string,
          leadId: event.data.leadId as string,
          createdAt: new Date(),
          read: false,
        };
        break;
      case 'call_missed':
        newNotification = {
          id: `rt-${Date.now()}`,
          type: 'call_missed',
          title: 'Missed Call',
          body: event.data.contactName || event.data.from as string,
          leadId: event.data.leadId as string,
          createdAt: new Date(),
          read: false,
        };
        break;
      case 'lead_assigned':
        newNotification = {
          id: `rt-${Date.now()}`,
          type: 'lead_assigned',
          title: 'Lead Assigned',
          body: event.data.message as string,
          leadId: event.data.leadId as string,
          createdAt: new Date(),
          read: false,
        };
        break;
    }

    if (newNotification) {
      setNotifications((prev) => [newNotification!, ...prev].slice(0, 20));
    }
  }, []);

  // Subscribe to real-time events
  useEffect(() => {
    if (realtimeContext) {
      return realtimeContext.subscribe(handleRealtimeEvent);
    }
  }, [realtimeContext, handleRealtimeEvent]);

  // Fetch initial notifications from API
  useEffect(() => {
    let active = true;
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (active) setNotifications(data ?? []);
      } catch (err) {
        console.error("Failed to load notifications", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 60000); // Reduced frequency since we have realtime
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleClick = (leadId?: string) => {
    if (leadId) {
      router.push(`/dashboard/chat/${leadId}`);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "hot_lead":
        return <Flame className="h-3.5 w-3.5 text-orange-400" />;
      case "new_response":
        return <MessageCircle className="h-3.5 w-3.5 text-sky-400" />;
      case "call_missed":
        return <Phone className="h-3.5 w-3.5 text-red-400" />;
      case "lead_assigned":
        return <Bell className="h-3.5 w-3.5 text-emerald-400" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const getTypeLabel = (type: Notification["type"]) => {
    switch (type) {
      case "hot_lead":
        return "Hot Lead";
      case "new_response":
        return "New Response";
      case "call_missed":
        return "Missed Call";
      case "lead_assigned":
        return "Lead Assigned";
      default:
        return "Notification";
    }
  };

  return (
    <div className="glass-panel absolute right-0 mt-3 w-96 rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-xl shadow-black/40 backdrop-blur-lg">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Notifications
          </p>
          <h3 className="text-sm font-semibold text-white">
            Live feed {unreadCount > 0 && <span className="text-blue-400">({unreadCount} new)</span>}
          </h3>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="text-xs text-slate-500">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-500">
            No new notifications
          </div>
        ) : (
          notifications.map((note) => (
            <button
              key={note.id}
              onClick={() => handleClick(note.leadId)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                note.read 
                  ? 'border-white/5 bg-white/[0.02] opacity-60' 
                  : 'border-white/10 bg-white/[0.03] hover:border-sky-400/50 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-400">
                <span className="flex items-center gap-1">
                  {getIcon(note.type)} {getTypeLabel(note.type)}
                </span>
                <span className="ml-auto lowercase text-slate-500">
                  {formatDistanceToNow(new Date(note.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                {!note.read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAsRead(note.id); }}
                    className="p-1 hover:bg-white/10 rounded"
                    title="Mark as read"
                  >
                    <Check size={12} />
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {note.title}
              </p>
              {note.body ? (
                <p className="text-xs text-slate-400 line-clamp-2">{note.body}</p>
              ) : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
