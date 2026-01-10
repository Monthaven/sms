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
  PhoneCall,
  MessageSquare,
  BarChart3,
  FileSignature,
  Upload,
  Clock,
  UserCircle,
  History,
  GitBranch,
  Zap,
  LucideIcon,
  Building2,
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";
import React, { useState } from "react";
import Image from "next/image";
import ProfileRail from "@/components/ProfileRail";

type Role = "ADMIN" | "AGENT" | "CALLER" | "MANAGER" | "INVESTOR";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles?: Role[];
  external?: boolean;
}

interface NavGroup {
  group: string;
  roles?: Role[];
  items: NavItem[];
}

const navItems: NavGroup[] = [
  {
    group: "Mission Control",
    items: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "My Stats", href: "/dashboard/agent", icon: UserCircle },
      { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
      { name: "Call Queue", href: "/dashboard/queue", icon: Phone },
      { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
      { name: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
      { name: "Sequences", href: "/sequences", icon: GitBranch },
      { name: "Intelligence", href: "/dashboard/intelligence", icon: BrainCircuit },
    ],
  },
  {
    group: "Deals & Intel",
    items: [
      { name: "OM Gallery", href: "https://om.monthavencapital.com/om", icon: Building2, external: true },
      { name: "Deal Pipeline", href: "https://om.monthavencapital.com/deals", icon: Activity, external: true },
    ],
  },
  {
    group: "Caller Station",
    roles: ["ADMIN", "MANAGER", "CALLER"],
    items: [
      { name: "Lead Queue", href: "/sms/queue", icon: MessageSquare },
      { name: "Dialer", href: "/sms/dial", icon: PhoneCall },
      { name: "Callbacks", href: "/sms/callbacks", icon: Clock },
      { name: "History", href: "/sms/history", icon: History },
    ],
  },
  {
    group: "System",
    roles: ["ADMIN", "MANAGER"],
    items: [
      { name: "Admin Hub", href: "/dashboard/admin", icon: Activity },
      { name: "Team", href: "/dashboard/admin/agents", icon: Users },
      { name: "User Management", href: "/dashboard/admin/users", icon: Users, roles: ["ADMIN"] },
      { name: "KPI Dashboard", href: "/dashboard/admin/kpis", icon: BarChart3 },
      { name: "Auto-Pilot", href: "/dashboard/admin/automations", icon: Zap },
      { name: "Connections", href: "/dashboard/admin/integrations", icon: LinkIcon },
      { name: "Import Leads", href: "/dashboard/admin/import", icon: Upload, roles: ["ADMIN"] },
      { name: "Contracts", href: "/dashboard/admin/contracts", icon: FileSignature, roles: ["ADMIN"] },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
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
      const val = cookie.split("=")[1] as Role;
      if (["ADMIN", "AGENT", "CALLER", "MANAGER", "INVESTOR"].includes(val)) {
        setRole(val);
      }
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
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full ring-1 ring-blue-500/30 blur-sm" />
            <Image
              src="/white-logo.svg"
              alt="Monthaven"
              fill
              className="p-1 drop-shadow-[0_0_14px_rgba(59,130,246,0.6)] object-contain"
            />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-white font-bold tracking-wide text-sm">MONTHAVEN</h1>
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
                    const isActive = !item.external && (pathname === item.href || pathname?.startsWith(item.href + "/"));
                    const linkClasses = clsx(
                      "flex items-center py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative",
                      collapsed ? "justify-center px-2" : "px-4",
                      isActive
                        ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    );
                    
                    const linkContent = (
                      <>
                        {!collapsed && isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full shadow-[0_0_10px_#3b82f6]" />
                        )}
                        <item.icon
                          size={18}
                          className={clsx(collapsed ? "" : "mr-3", isActive ? "text-blue-400" : "group-hover:text-white")}
                        />
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            {item.name}
                            {item.external && <ExternalLink size={12} className="text-slate-500" />}
                          </span>
                        )}
                      </>
                    );
                    
                    // Use <a> for external links, <Link> for internal
                    if (item.external) {
                      return (
                        <a
                          key={item.name}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClasses}
                        >
                          {linkContent}
                        </a>
                      );
                    }
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={linkClasses}
                      >
                        {linkContent}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <Link
          href="/dashboard/settings"
          className={clsx(
            "flex items-center w-full p-2 rounded-xl hover:bg-slate-800/50 transition-colors text-left group",
            collapsed ? "justify-center" : ""
          )}
        >
          <Settings size={18} className={clsx("text-slate-500 group-hover:text-white transition-colors", collapsed ? "" : "mr-3")} />
          {!collapsed && <span className="text-sm text-slate-400 group-hover:text-white">Settings</span>}
        </Link>
        <ProfileRail collapsed={collapsed} />
      </div>
    </aside>
  );
}
