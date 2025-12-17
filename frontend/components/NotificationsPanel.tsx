"use client";

import { PRIMARY_NAV } from "@/lib/navigation";
import Link from "next/link";
import { Bell, Flame, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  type: "hot_lead" | "new_response";
  title: string;
  body: string;
  href: string;
  time: Date;
};

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Notifications</p>
          <h3 className="text-lg font-semibold text-white">Ops feed</h3>
        </div>
        <Bell className="h-5 w-5 text-sky-300" />
      </div>
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-xs text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="text-xs text-slate-500">No new notifications</div>
        ) : (
          notifications.map((note) => (
            <Link
              key={note.id}
              href={note.href}
              className="block rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-sky-400/40 hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {note.type === "hot_lead" ? (
                  <Flame className="h-3.5 w-3.5 text-orange-400" />
                ) : (
                  <MessageCircle className="h-3.5 w-3.5 text-sky-300" />
                )}
                {formatDistanceToNow(new Date(note.time), { addSuffix: true })}
              </div>
              <p className="mt-2 font-semibold text-white">{note.title}</p>
              <p className="text-xs text-slate-400">{note.body}</p>
            </Link>
          ))
        )}
      </div>
      <div className="mt-6 space-y-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
        <p>Quick nav</p>
        <div className="flex flex-wrap gap-2">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:border-sky-300/50 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
