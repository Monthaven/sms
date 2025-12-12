"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  Inbox,
  Megaphone,
  BrainCircuit,
  Users,
  Activity,
  Link as LinkIcon,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";
import React, { useState } from "react";

type Role = "ADMIN" | "AGENT";

const navItems: Array<{
  group: string;
  roles?: Role[];
  items: Array<{ name: string; href: string; icon: any; roles?: Role[] }>;
}> = [
  {
    group: "Mission Control",
    items: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Call Queue", href: "/dashboard/queue", icon: Phone },
      { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
      { name: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
      { name: "Intelligence", href: "/dashboard/intelligence", icon: BrainCircuit },
    ],
  },
  {
    group: "System",
    roles: ["ADMIN"],
    items: [
      { name: "Team", href: "/dashboard/admin/agents", icon: Users, roles: ["ADMIN"] },
      { name: "Auto-Pilot", href: "/dashboard/admin/automations", icon: Activity, roles: ["ADMIN"] },
      { name: "Connections", href: "/dashboard/admin/integrations", icon: LinkIcon, roles: ["ADMIN"] },
    ],
  },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>("AGENT");

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const cookie = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("mae_role="));
    if (cookie) {
      const val = cookie.split("=")[1];
      if (val === "ADMIN" || val === "AGENT") setRole(val);
    }
  }, []);

  return (
    <aside
      className={clsx(
        "bg-[#0B1120]/95 backdrop-blur-xl border-r border-slate-800 flex flex-col h-screen flex-shrink-0 transition-all duration-200",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div
        className={clsx(
          "p-6 mb-2 flex items-center",
          collapsed ? "justify-center" : "justify-between gap-3"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-white font-bold tracking-wide text-sm">MONTHAVEN</h1>
              <p className="text-[10px] text-blue-400 tracking-widest uppercase">
                Acquisition Engine
              </p>
            </div>
          )}
        </div>
        <button
          aria-label="Toggle sidebar"
          onClick={onToggle}
          className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <div className={clsx("flex-1 overflow-y-auto space-y-8 custom-scrollbar", collapsed ? "px-2" : "px-4")}>
        {navItems
          .filter((group) => !group.roles || group.roles.includes(role))
          .map((group) => (
            <div key={group.group}>
              {!collapsed && (
                <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  {group.group}
                </h3>
              )}
              <div className="space-y-1">
                {group.items
                  .filter((item) => !item.roles || item.roles.includes(role))
                  .map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={clsx(
                          "flex items-center py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative",
                          collapsed ? "justify-center px-2" : "px-4",
                          isActive
                            ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                        )}
                      >
                        {!collapsed && isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full shadow-[0_0_10px_#3b82f6]" />
                        )}
                        <item.icon
                          size={18}
                          className={clsx(collapsed ? "" : "mr-3", isActive ? "text-blue-400" : "group-hover:text-white")}
                        />
                        {!collapsed && item.name}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800">
        <Link
          href={role === "ADMIN" ? "/dashboard/admin/agents" : "/dashboard"}
          className={clsx(
            "flex items-center w-full p-2 rounded-xl hover:bg-slate-800/50 transition-colors text-left group",
            collapsed ? "justify-center" : ""
          )}
        >
          <div
            className={clsx(
              "w-8 h-8 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center text-xs text-slate-300",
              collapsed ? "" : "mr-3"
            )}
          >
            AD
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-[10px] text-slate-400 truncate">admin@monthaven.com</p>
            </div>
          )}
          {!collapsed && <Settings size={16} className="text-slate-500 group-hover:text-white transition-colors" />}
        </Link>
      </div>
    </aside>
  );
}
