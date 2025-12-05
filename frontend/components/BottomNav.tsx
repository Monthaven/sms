"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Megaphone,
} from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { id: "/dashboard", icon: LayoutDashboard, label: "Dash" },
    { id: "/dashboard/queue", icon: ListTodo, label: "Queue" },
    { id: "/dashboard/chat", icon: MessageSquare, label: "Inbox" },
    { id: "/dashboard/campaigns", icon: Megaphone, label: "Cmpgn" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path !== "/dashboard" && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-gray-800 bg-[#151B2D] px-2 pb-safe shadow-2xl">
      {items.map((item) => {
        const active = isActive(item.id);
        return (
          <Link
            key={item.id}
            href={item.id}
            className={`flex h-full w-full flex-col items-center justify-center space-y-1 ${
              active ? "text-indigo-400" : "text-gray-500"
            }`}
          >
            <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
