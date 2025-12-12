"use client";

import React from "react";
import { Search, Bell, Command, ChevronRight } from "lucide-react";

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
        
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Global Search" 
            className="w-64 bg-slate-900/50 border border-slate-700/50 rounded-lg py-2 pl-10 pr-10 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 border border-slate-700 rounded px-1.5 py-0.5">
             <Command size={10} className="text-slate-500" />
             <span className="text-[10px] text-slate-500">K</span>
          </div>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0B1120]"></span>
        </button>

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