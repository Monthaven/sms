"use client";

import React, { useState } from "react";
import { Search, Bell, Command, ChevronRight } from "lucide-react";
import NotificationsPanel from "@/components/NotificationsPanel";
import GlobalSearch from "@/components/GlobalSearch";

export default function TopBar() {
  return (
    <header className="h-20 px-8 flex items-center justify-between border-b border-slate-800/50 bg-[#0B1120]/90 backdrop-blur-md sticky top-0 z-40">
      
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500 font-medium">Command Center</span>
        <ChevronRight size={14} className="text-slate-600" />
        <span className="text-white font-semibold tracking-wide">Overview</span>
      </div>


      {/* Right: Actions */}
      <div className="flex items-center gap-6">
        <GlobalSearch />

        {/* Notifications */}
        <NotificationsToggle />

        {/* Profile Dropdown Trigger */}
        <div className="flex items-center gap-3 pl-6 border-l border-slate-800/50">
          <div className="text-right hidden md:block">
            <div className="text-xs font-semibold text-white">Admin Agent</div>
            <div className="text-[10px] text-emerald-400">Online</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-400/30 shadow-lg shadow-blue-500/20 flex items-center justify-center text-xs font-bold text-white">
            AA
          </div>
        </div>
      </div>
    </header>
  );
}

function NotificationsToggle() {
  const [open, setOpen] = useState(false);
  const [unread] = useState(0);

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative p-2 text-slate-400 hover:text-white transition-colors">
        <Bell size={20} />
        {unread > 0 && <span className="absolute top-1.5 right-2 w-3 h-3 bg-rose-500 rounded-full border-2 border-[#0B1120]"></span>}
      </button>
      {open && <div className="absolute right-0 mt-2 z-50"><NotificationsPanel /></div>}
    </div>
  );
}