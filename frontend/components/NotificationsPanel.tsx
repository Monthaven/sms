"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  type: "hot_lead" | "new_response";
  title: string;
  body?: string;
  leadId: string;
  createdAt: string | Date;
};

export default function NotificationsPanel() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

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
    const intervalId = setInterval(fetchNotifications, 30000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleClick = (leadId: string) => {
    router.push(`/dashboard/chat/${leadId}`);
  };

  return (
    <div className="glass-panel absolute right-0 mt-3 w-96 rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-xl shadow-black/40 backdrop-blur-lg">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Notifications
          </p>
          <h3 className="text-sm font-semibold text-white">Live feed</h3>
        </div>
      </div>

      <div className="space-y-3">
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
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-sky-400/50 hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-400">
                {note.type === "hot_lead" ? (
                  <span className="flex items-center gap-1 text-orange-300">
                    <Flame className="h-3.5 w-3.5" /> Hot lead
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sky-300">
                    <MessageCircle className="h-3.5 w-3.5" /> New response
                  </span>
                )}
                <span className="ml-auto lowercase text-slate-500">
                  {formatDistanceToNow(new Date(note.createdAt), {
                    addSuffix: true,
                  })}
                </span>
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
