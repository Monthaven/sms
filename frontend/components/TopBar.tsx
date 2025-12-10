"use client";

import React, { useState } from "react";
import { Search, Bell, Menu, Command } from "lucide-react";
import { usePathname } from "next/navigation";
import { buildBreadcrumbs } from "../lib/navigation";
import Sidebar from "./Sidebar";

export default function TopBar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const breadcrumbs = buildBreadcrumbs(pathname || "");
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "Overview";
  const sectionTitle = breadcrumbs.length > 1 ? breadcrumbs[0].label : "Monthaven";

  return (
    <>
      {/* Spec Update: 
        - Reduced opacity to 80% to see grid/content scroll under 
        - Increased backdrop-blur to 16px for premium feel
        - Added bottom highlight border (white/5) 
      */}
      <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md px-4 md:px-8 transition-all">
        
        <div className="flex items-center gap-6">
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-400 hover:text-white">
            <Menu size={24} />
          </button>

          {/* Breadcrumbs / Title */}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-bold text-white capitalize tracking-tight text-shadow-sm">
              {pageTitle}
            </h1>
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-widest">
              <span className="hidden md:inline hover:text-indigo-400 transition-colors cursor-pointer">{sectionTitle}</span>
              <span className="hidden md:inline text-slate-700">/</span>
              <span className="text-indigo-400/80">System</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-5">
           
           {/* Search Input - Glass Spec */}
           <div className="relative hidden md:block group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
             <input 
               type="text" 
               placeholder="Global Search..." 
               className="w-72 rounded-lg border border-white/5 bg-white/[0.03] py-2 pl-10 pr-12 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/30 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-inner"
             />
             <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
               <Command size={10} className="text-slate-600" />
               <span className="text-[10px] text-slate-600 font-mono">K</span>
             </div>
           </div>
           
           <div className="h-6 w-px bg-white/10 mx-2 hidden md:block" />

           <button className="relative rounded-xl p-2.5 text-slate-400 transition-all hover:bg-white/5 hover:text-white group">
            <Bell size={20} />
            {/* Pulsing Notification Dot */}
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-72 h-full shadow-2xl bg-[#0B0F19]">
            <Sidebar onItemClick={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}