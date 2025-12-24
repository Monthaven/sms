/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  MessageSquare,
  Phone,
  Settings,
} from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { id: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { id: "/dashboard/inbox", icon: Inbox, label: "Inbox" },
    { id: "/dashboard/chat", icon: MessageSquare, label: "Chat" },
    { id: "/sms/dial", icon: Phone, label: "Dial" },
    { id: "/dashboard/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path !== "/dashboard" && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-slate-800 bg-slate-950/95 backdrop-blur-lg px-2 pb-safe shadow-2xl z-50">
      {items.map((item) => {
        const active = isActive(item.id);
        return (
          <Link
            key={item.id}
            href={item.id}
            className={`flex h-full w-full flex-col items-center justify-center space-y-1 transition-colors ${
              active ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
            {active && (
              <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
