"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  BarChart3,
  Settings,
  Users,
  Bot,
  Plug,
  Megaphone,
} from "lucide-react";
import { THEME } from "@/lib/theme";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { id: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "/dashboard/queue", label: "Call Queue", icon: ListTodo },
    { id: "/dashboard/chat", label: "Inbox", icon: MessageSquare },
    { id: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
    { id: "/dashboard/intelligence", label: "Intelligence", icon: BarChart3 },
  ];

  const adminItems = [
    { id: "/dashboard/admin/agents", label: "Team", icon: Users },
    { id: "/dashboard/admin/automations", label: "Auto-Pilot", icon: Bot },
    { id: "/dashboard/admin/integrations", label: "Connections", icon: Plug },
  ];

  const baseClasses =
    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group text-sm font-medium border border-transparent";
  const activeClasses =
    "bg-[#1E2538] text-white border-[#2A3449] shadow-lg shadow-black/20";
  const inactiveClasses =
    "text-gray-500 hover:text-gray-200 hover:bg-[#151B2D]";

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path !== "/dashboard" && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <div
      className={`flex h-full flex-col ${THEME.bg} border-r ${THEME.border} w-72 transition-all duration-300 ease-in-out`}
    >
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 font-bold text-xl text-white tracking-wide">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white shadow-xl shadow-indigo-500/20">
            <MessageSquare size={20} fill="currentColor" />
          </div>
          Monthaven
        </div>
        <div className="mt-2 pl-12 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
          Private Console
        </div>
      </div>

      <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto px-4 py-6">
        <div>
          <div className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            Mission Control
          </div>
          <div className="mt-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.id}
                className={`${baseClasses} ${
                  isActive(item.id) ? activeClasses : inactiveClasses
                } w-full`}
              >
                <item.icon
                  size={18}
                  className={
                    isActive(item.id)
                      ? "text-indigo-400"
                      : "text-gray-600 group-hover:text-gray-400"
                  }
                />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            System
          </div>
          <div className="mt-4 space-y-1">
            {adminItems.map((item) => (
              <Link
                key={item.id}
                href={item.id}
                className={`${baseClasses} ${
                  isActive(item.id) ? activeClasses : inactiveClasses
                } w-full`}
              >
                <item.icon
                  size={18}
                  className={
                    isActive(item.id)
                      ? "text-indigo-400"
                      : "text-gray-600 group-hover:text-gray-400"
                  }
                />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[#1E2538] p-6">
        <div className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[#2A3449] bg-[#151B2D] p-3 shadow-lg hover:border-gray-600">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800 font-bold text-gray-300 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
            JD
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-200">
              John Doe
            </p>
            <p className="truncate text-[10px] text-gray-500 transition-colors group-hover:text-gray-400">
              Super Admin
            </p>
          </div>
          <Settings size={16} className="text-gray-600 group-hover:text-white" />
        </div>
      </div>
    </div>
  );
}
