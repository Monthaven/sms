"use client";

import { PRIMARY_NAV } from "@/lib/navigation";
import Link from "next/link";
import { Bell, MessageSquare, SignalHigh, Users } from "lucide-react";

const notifications = [
  {
    id: "note-1",
    title: "Hot reply · Legacy 2024",
    body: "Owner asked for pricing details. Assign closer within 15m.",
    time: "2m ago",
    icon: MessageSquare,
    href: "/dashboard/chat",
  },
  {
    id: "note-2",
    title: "Agent load high",
    body: "Jordan Pace is handling 12 leads. Rebalance queue.",
    time: "9m ago",
    icon: Users,
    href: "/dashboard/admin/agents",
  },
  {
    id: "note-3",
    title: "Ingestion job finished",
    body: "11-10 MF new contacts imported. Review job metrics.",
    time: "27m ago",
    icon: SignalHigh,
    href: "/dashboard/reports",
  },
];

export default function NotificationsPanel() {
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
        {notifications.map((note) => (
          <Link
            key={note.id}
            href={note.href}
            className="block rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-sky-400/40 hover:bg-white/[0.06]"
          >
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <note.icon className="h-3.5 w-3.5 text-sky-300" />
              {note.time}
            </div>
            <p className="mt-2 font-semibold text-white">{note.title}</p>
            <p className="text-xs text-slate-400">{note.body}</p>
          </Link>
        ))}
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
